"""FastAPI server for the Phylaxify judol filter (HF Space entry point).

Two-layer pipeline:
  1. blocklist.csv — fast keyword/brand match on aggressive_view. If a known
     judol brand or strong promo phrase is present, short-circuit to JUDOL
     without invoking the model. Editable by the user.
  2. IndoBERT v3 — semantic classifier with a precision-tuned threshold
     loaded from phylaxify_config.json.

Response shape stays compatible with the v0.2 backend's ML filter layer.
"""

import csv
import json
import logging
import os
import re
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from preprocess import aggressive_view, make_input, normalize_text

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("phylaxify-ml")

MODEL_PATH = os.environ.get("MODEL_PATH", "./models")
BLOCKLIST_PATH = os.environ.get("BLOCKLIST_PATH", "./blocklist.csv")
LABEL_MAP = {0: "CLEAN", 1: "JUDOL"}

state: dict = {
    "model": None,
    "tokenizer": None,
    "threshold": 0.5,
    "max_length": 256,
    "blocklist": [],
}


@dataclass
class BlockEntry:
    term: str
    category: str
    match_type: str  # "substring" | "exact" | "regex"
    note: str
    pattern: Optional[re.Pattern] = None


def _load_blocklist(path: str) -> list[BlockEntry]:
    """Parse blocklist.csv. Tolerant to '#' comments and blank lines."""
    p = Path(path)
    if not p.exists():
        log.warning(f"blocklist not found at {path}, skipping keyword layer")
        return []

    entries: list[BlockEntry] = []
    with p.open("r", encoding="utf-8") as f:
        # Strip comments before handing to csv.DictReader so a '#' inside a
        # field doesn't confuse anyone — comments are only line-prefix.
        cleaned = (line for line in f if line.strip() and not line.lstrip().startswith("#"))
        reader = csv.DictReader(cleaned)
        for row in reader:
            term = (row.get("term") or "").strip().lower()
            if not term:
                continue
            category = (row.get("category") or "custom").strip().lower()
            match_type = (row.get("match_type") or "substring").strip().lower()
            note = (row.get("note") or "").strip()
            pattern = None
            if match_type == "regex":
                try:
                    pattern = re.compile(term, re.IGNORECASE)
                except re.error as e:
                    log.warning(f"skipping invalid regex {term!r}: {e}")
                    continue
            elif match_type == "exact":
                # Whole-word exact match in aggressive_view (which is already
                # lowercase, alnum-only with single spaces).
                pattern = re.compile(rf"(?:^|\s){re.escape(term)}(?:\s|$)")
            elif match_type != "substring":
                log.warning(f"unknown match_type {match_type!r} for {term!r}, defaulting to substring")
                match_type = "substring"
            entries.append(BlockEntry(term, category, match_type, note, pattern))
    log.info(f"loaded {len(entries)} blocklist entries from {path}")
    return entries


def _check_blocklist(aggressive: str, entries: list[BlockEntry]) -> list[dict]:
    """Return list of matched entries (each as dict) for given aggressive view."""
    if not aggressive or not entries:
        return []
    hits: list[dict] = []
    for e in entries:
        matched = False
        if e.match_type == "substring":
            matched = e.term in aggressive
        elif e.pattern is not None:  # exact or regex
            matched = e.pattern.search(aggressive) is not None
        if matched:
            hits.append({"term": e.term, "category": e.category, "match_type": e.match_type})
    return hits


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(f"Loading model from {MODEL_PATH}...")
    state["tokenizer"] = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    model.eval()
    if torch.cuda.is_available():
        model.to("cuda")
        log.info("Model loaded on GPU")
    else:
        log.info("Model loaded on CPU")
    state["model"] = model

    cfg_path = Path(MODEL_PATH) / "phylaxify_config.json"
    if cfg_path.exists():
        cfg = json.loads(cfg_path.read_text())
        state["threshold"] = float(cfg.get("threshold", 0.5))
        state["max_length"] = int(cfg.get("max_length", 256))
        log.info(f"threshold={state['threshold']:.4f}, max_length={state['max_length']}")
    else:
        log.warning("phylaxify_config.json not found, using defaults")

    state["blocklist"] = _load_blocklist(BLOCKLIST_PATH)
    yield


app = FastAPI(title="Phylaxify IndoBERT Judol Filter", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4096)


class PredictResponse(BaseModel):
    label: str
    confidence: float
    p_judol: float
    threshold: float
    all_scores: dict
    matched_patterns: list
    blocklist_hits: list
    layer: str  # "blocklist" | "model"
    normalized: str
    aggressive: str
    processing_ms: float


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": state["model"] is not None,
        "threshold": state["threshold"],
        "max_length": state["max_length"],
        "blocklist_entries": len(state["blocklist"]),
    }


@app.get("/blocklist")
async def list_blocklist():
    """Inspect currently-loaded blocklist entries (for the dashboard)."""
    return {
        "count": len(state["blocklist"]),
        "entries": [
            {"term": e.term, "category": e.category, "match_type": e.match_type, "note": e.note}
            for e in state["blocklist"]
        ],
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    model, tokenizer = state["model"], state["tokenizer"]
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="model not loaded")

    start = time.time()
    try:
        norm = normalize_text(req.text)
        aggr = aggressive_view(req.text)

        # Layer 1: keyword/brand blocklist (zero-doubt, fastest path).
        hits = _check_blocklist(aggr, state["blocklist"])
        if hits:
            return PredictResponse(
                label="JUDOL",
                confidence=1.0,
                p_judol=1.0,
                threshold=state["threshold"],
                all_scores={"CLEAN": 0.0, "JUDOL": 1.0},
                matched_patterns=[h["term"] for h in hits],
                blocklist_hits=hits,
                layer="blocklist",
                normalized=norm,
                aggressive=aggr,
                processing_ms=round((time.time() - start) * 1000, 2),
            )

        # Layer 2: IndoBERT semantic classifier.
        model_input = make_input(req.text)
        enc = tokenizer(
            model_input,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=state["max_length"],
        )
        device = next(model.parameters()).device
        enc = {k: v.to(device) for k, v in enc.items()}

        with torch.no_grad():
            logits = model(**enc).logits
            probs = F.softmax(logits, dim=-1)[0].cpu().tolist()

        p_clean, p_judol = probs[0], probs[1]
        threshold = state["threshold"]
        is_judol = p_judol >= threshold
        label = "JUDOL" if is_judol else "CLEAN"
        confidence = p_judol if is_judol else p_clean
        all_scores = {"CLEAN": p_clean, "JUDOL": p_judol}
        matched = [label] if is_judol else []

        return PredictResponse(
            label=label,
            confidence=confidence,
            p_judol=p_judol,
            threshold=threshold,
            all_scores=all_scores,
            matched_patterns=matched,
            blocklist_hits=[],
            layer="model",
            normalized=norm,
            aggressive=aggr,
            processing_ms=round((time.time() - start) * 1000, 2),
        )
    except Exception as e:
        log.exception("inference error")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=7860)
