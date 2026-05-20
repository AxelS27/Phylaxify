import json
from pathlib import Path

import joblib


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "hf-space" / "models" / "svm_level3.joblib"
TARGET = ROOT / "api" / "_lib" / "ml" / "svm-level3-model.json"


def main() -> None:
    bundle = joblib.load(SOURCE)
    model = bundle["model"]
    vectorizer = bundle["vectorizer"]

    classifiers = []
    for calibrated in model.calibrated_classifiers_:
        estimator = calibrated.estimator
        calibrator = calibrated.calibrators[0]
        classifiers.append(
            {
                "coef": [float(v) for v in estimator.coef_[0]],
                "intercept": float(estimator.intercept_[0]),
                "sigmoidA": float(calibrator.a_),
                "sigmoidB": float(calibrator.b_),
            }
        )

    payload = {
        "metadata": bundle.get("metadata", {}),
        "vectorizer": {
            "vocabulary": {term: int(idx) for term, idx in vectorizer.vocabulary_.items()},
            "idf": [float(v) for v in vectorizer.idf_],
            "ngramRange": list(vectorizer.ngram_range),
            "sublinearTf": bool(vectorizer.sublinear_tf),
            "norm": vectorizer.norm,
            "tokenPattern": vectorizer.token_pattern,
        },
        "classes": [int(v) for v in model.classes_],
        "classifiers": classifiers,
    }

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {TARGET}")
    print(f"Size: {TARGET.stat().st_size / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
