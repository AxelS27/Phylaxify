"""Fine-tune IndoBERT for binary judol/clean classification.

Pipeline highlights:
  - Loads dataset.csv (target, raw_text), drops malformed rows
  - Stratified 80/10/10 train/val/test split
  - Targeted augmentation: each JUDOL example spawns N obfuscated variants
    (space-out brand names, leetspeak, symbol injection)
  - Dual-view input via preprocess.make_input (BERT sees normalized + de-obfuscated)
  - Class-weighted CE loss to counter the slight imbalance
  - Picks best checkpoint by F1 on the JUDOL class (recall matters most)

Usage:
    python train.py                # full run, defaults
    python train.py --smoke        # 80 examples, 1 epoch — sanity check
    python train.py --epochs 4 --batch 8
"""

import argparse
import logging
import random
import re
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from datasets import Dataset
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    EarlyStoppingCallback,
    Trainer,
    TrainingArguments,
    set_seed,
)

from preprocess import make_input

logging.basicConfig(format="%(asctime)s %(levelname)s %(message)s", level=logging.INFO)
log = logging.getLogger("train")

LABEL_NAMES = ["CLEAN", "JUDOL"]
SCRIPT_DIR = Path(__file__).resolve().parent

# ---------------------------------------------------------------- Augmentation

# Brand-shaped tokens (letters with optional trailing digits) — what gets spaced
_BRAND_RE = re.compile(r"\b([A-Za-z]{3,12}\d{0,3})\b")
_WORD_RE = re.compile(r"\b([A-Za-z]{4,})\b")
_LEET_INV = {"a": "@", "i": "1", "o": "0", "e": "3", "s": "$"}


def _space_out(match):
    return " ".join(match.group(1))


def _leetify_word(w: str) -> str:
    return "".join(_LEET_INV.get(c.lower(), c) if random.random() < 0.5 else c for c in w)


def _sep_inject(match):
    sep = random.choice([".", "_", "-", " "])
    return sep.join(match.group(1))


def augment(text: str, n: int = 2) -> list[str]:
    """Generate up to n distinct obfuscated variants of text."""
    variants: list[str] = []
    seen = {text}
    attempts = 0
    while len(variants) < n and attempts < n * 4:
        attempts += 1
        kind = random.choice(["space", "leet", "sep", "mixed"])
        if kind == "space":
            v = _BRAND_RE.sub(_space_out, text, count=1)
        elif kind == "leet":
            v = _WORD_RE.sub(lambda m: _leetify_word(m.group(1)), text, count=2)
        elif kind == "sep":
            v = _WORD_RE.sub(_sep_inject, text, count=1)
        else:  # mixed: space + leet
            v = _BRAND_RE.sub(_space_out, text, count=1)
            v = _WORD_RE.sub(lambda m: _leetify_word(m.group(1)), v, count=1)
        if v != text and v not in seen:
            variants.append(v)
            seen.add(v)
    return variants


# ---------------------------------------------------------------- Data loading

def load_dataframe(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df.columns = [c.strip().lower() for c in df.columns]
    if "target" not in df.columns or "raw_text" not in df.columns:
        raise ValueError(f"Expected 'target,raw_text', got: {df.columns.tolist()}")
    df = df.dropna(subset=["target", "raw_text"]).copy()
    df["target"] = pd.to_numeric(df["target"], errors="coerce")
    df = df.dropna(subset=["target"])
    df["target"] = df["target"].astype(int)
    df = df[df["target"].isin([0, 1])]
    df["raw_text"] = df["raw_text"].astype(str).str.strip()
    df = df[df["raw_text"].str.len() > 0]
    return df.reset_index(drop=True)


def balance_one_to_one(df: pd.DataFrame, seed: int) -> pd.DataFrame:
    """Return a DataFrame with EXACTLY 1:1 clean/judol ratio.

    Strategy: keep all clean rows; oversample judol via obfuscated augmentation
    (and plain duplication as fallback) until counts match. Never undersamples
    clean — we don't want to throw signal away.
    """
    clean = df[df["target"] == 0]
    judol = df[df["target"] == 1]
    rows = [{"text": str(t), "label": 0} for t in clean["raw_text"]]
    rows.extend({"text": str(t), "label": 1} for t in judol["raw_text"])

    target_n = len(clean)
    needed = target_n - len(judol)
    if needed <= 0:
        return pd.DataFrame(rows)

    rng = random.Random(seed)
    judol_texts = list(judol["raw_text"])
    rng.shuffle(judol_texts)
    pool: list[str] = []
    cycle_idx = 0
    added = 0
    while added < needed:
        if not pool:
            base = judol_texts[cycle_idx % len(judol_texts)]
            cycle_idx += 1
            pool = augment(base, n=3) or [base]
        rows.append({"text": pool.pop(0), "label": 1})
        added += 1
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- Metrics

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy": accuracy_score(labels, preds),
        "f1_judol": f1_score(labels, preds, pos_label=1, zero_division=0),
        "precision_judol": precision_score(labels, preds, pos_label=1, zero_division=0),
        "recall_judol": recall_score(labels, preds, pos_label=1, zero_division=0),
        "f1_macro": f1_score(labels, preds, average="macro", zero_division=0),
    }


# ---------------------------------------------------------------- Trainer

class WeightedTrainer(Trainer):
    """CE loss with per-class weights to counter imbalance."""

    def __init__(self, *args, class_weights=None, **kw):
        super().__init__(*args, **kw)
        self.class_weights = class_weights

    def compute_loss(self, model, inputs, return_outputs=False, **kw):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        logits = outputs.logits
        weight = self.class_weights.to(logits.device) if self.class_weights is not None else None
        loss = torch.nn.functional.cross_entropy(
            logits.view(-1, model.config.num_labels), labels.view(-1), weight=weight
        )
        return (loss, outputs) if return_outputs else loss


# ---------------------------------------------------------------- Main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=str(SCRIPT_DIR / "dataset.csv"))
    ap.add_argument("--out", default=str(SCRIPT_DIR / "models"))
    ap.add_argument("--base-model", default="indobenchmark/indobert-base-p1")
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--seq-len", type=int, default=128)
    ap.add_argument("--lr", type=float, default=2e-5)
    ap.add_argument("--n-aug", type=int, default=2,
                    help="obfuscated variants per JUDOL example (0 disables)")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--smoke", action="store_true",
                    help="80 rows, 1 epoch — pipeline sanity check")
    args = ap.parse_args()

    set_seed(args.seed)
    random.seed(args.seed)
    np.random.seed(args.seed)

    log.info(f"Loading {args.csv}")
    df = load_dataframe(Path(args.csv))
    log.info(f"Loaded {len(df)} rows. Label dist: {df['target'].value_counts().to_dict()}")

    if args.smoke:
        df = df.groupby("target", group_keys=False).head(80).reset_index(drop=True)
        log.info(f"SMOKE mode: subsetted to {len(df)} rows")

    train_df, tmp_df = train_test_split(
        df, test_size=0.2, stratify=df["target"], random_state=args.seed
    )
    val_df, test_df = train_test_split(
        tmp_df, test_size=0.5, stratify=tmp_df["target"], random_state=args.seed
    )
    log.info(f"Split: train={len(train_df)} val={len(val_df)} test={len(test_df)}")

    train_df = balance_one_to_one(train_df, seed=args.seed)
    n_clean_t = int((train_df["label"] == 0).sum())
    n_judol_t = int((train_df["label"] == 1).sum())
    log.info(
        f"After 1:1 balancing: train={len(train_df)} "
        f"(clean:{n_clean_t}, judol:{n_judol_t}, ratio={n_clean_t/n_judol_t:.3f})"
    )

    log.info("Applying dual-view input transform...")
    train_df["text"] = train_df["text"].map(make_input)
    val_df = val_df.rename(columns={"raw_text": "text", "target": "label"})
    val_df["text"] = val_df["text"].map(make_input)
    test_df = test_df.rename(columns={"raw_text": "text", "target": "label"})
    test_df["text"] = test_df["text"].map(make_input)

    # Train is exactly balanced -> uniform class weights (no-op, kept for the
    # WeightedTrainer interface and to make accidental imbalance loud).
    total = n_clean_t + n_judol_t
    class_weights = torch.tensor(
        [total / (2 * n_clean_t), total / (2 * n_judol_t)], dtype=torch.float
    )
    log.info(f"Class weights (clean, judol): {class_weights.tolist()}")

    log.info(f"Loading tokenizer + model: {args.base_model}")
    tokenizer = AutoTokenizer.from_pretrained(args.base_model)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.base_model,
        num_labels=2,
        id2label={0: "CLEAN", 1: "JUDOL"},
        label2id={"CLEAN": 0, "JUDOL": 1},
    )

    def tokenize(batch):
        return tokenizer(batch["text"], truncation=True, max_length=args.seq_len)

    train_ds = Dataset.from_pandas(train_df[["text", "label"]], preserve_index=False).map(
        tokenize, batched=True, remove_columns=["text"]
    )
    val_ds = Dataset.from_pandas(val_df[["text", "label"]], preserve_index=False).map(
        tokenize, batched=True, remove_columns=["text"]
    )
    test_ds = Dataset.from_pandas(test_df[["text", "label"]], preserve_index=False).map(
        tokenize, batched=True, remove_columns=["text"]
    )

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(out_dir / "_trainer_ckpts"),
        num_train_epochs=1 if args.smoke else args.epochs,
        per_device_train_batch_size=args.batch,
        per_device_eval_batch_size=args.batch * 2,
        learning_rate=args.lr,
        weight_decay=0.01,
        warmup_steps=100,
        logging_steps=50,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="f1_judol",
        greater_is_better=True,
        report_to=[],
        seed=args.seed,
        fp16=torch.cuda.is_available(),
    )

    trainer = WeightedTrainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        processing_class=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
        compute_metrics=compute_metrics,
        class_weights=class_weights,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
    )

    log.info("Starting training...")
    trainer.train()

    log.info("Evaluating on held-out test set...")
    pred_out = trainer.predict(test_ds)
    preds = np.argmax(pred_out.predictions, axis=-1)
    log.info(
        "\n" + classification_report(
            pred_out.label_ids, preds, target_names=LABEL_NAMES, digits=4
        )
    )
    cm = confusion_matrix(pred_out.label_ids, preds)
    log.info(f"Confusion matrix (rows=true, cols=pred):\n{cm}")

    log.info(f"Saving final model to {out_dir}")
    trainer.save_model(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))
    log.info("Done.")


if __name__ == "__main__":
    main()
