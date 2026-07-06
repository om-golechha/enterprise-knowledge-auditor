"""
Minimal Evaluation Harness for Sentinel Contradiction Detection.

WHY: A judge seeing actual precision/recall/F1 scores beats every other team
showing a demo with no evaluation. This script runs 18 hand-labeled claim
pairs through the same verify_and_score pipeline the production system uses,
compares predictions against ground truth labels, and prints metrics.

Usage:
    cd backend
    python -m eval.run_eval
"""

import json
import os
import sys
import time
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sentinel.eval")


def load_labeled_pairs() -> list[dict]:
    """Load the hand-labeled evaluation fixture from JSON.

    Returns a list of dicts with keys: id, claim_a, claim_b, label (bool),
    rationale (str).
    """
    fixture_path = os.path.join(os.path.dirname(__file__), "labeled_pairs.json")
    with open(fixture_path, "r") as f:
        return json.load(f)


def evaluate_pair(claim_a: str, claim_b: str) -> bool:
    """Run a single claim pair through the existing verification pipeline.

    Uses the same LLM chain and ContradictionResult model as the production
    graph. Returns True if the model predicts a contradiction, False otherwise.
    """
    from app.models import ContradictionResult
    from app.llm import get_llm
    from app.prompts import contradiction_verification_prompt

    llm = get_llm().with_structured_output(ContradictionResult, method="json_mode")
    chain = (contradiction_verification_prompt | llm).with_retry(stop_after_attempt=3)

    result = chain.invoke({"claim_a": claim_a, "claim_b": claim_b})
    return result.contradiction


def compute_metrics(
    labels: list[bool], predictions: list[bool]
) -> dict[str, float]:
    """Compute precision, recall, and F1 from ground truth and predictions.

    Positive class = contradiction (True). Returns a dict with keys:
    precision, recall, f1, accuracy.
    """
    tp = sum(1 for l, p in zip(labels, predictions) if l and p)
    fp = sum(1 for l, p in zip(labels, predictions) if not l and p)
    fn = sum(1 for l, p in zip(labels, predictions) if l and not p)
    tn = sum(1 for l, p in zip(labels, predictions) if not l and not p)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    accuracy = (tp + tn) / len(labels) if labels else 0.0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "accuracy": round(accuracy, 4),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
    }


def main():
    """Run the full evaluation harness and print results."""
    pairs = load_labeled_pairs()
    logger.info("Loaded %d labeled pairs", len(pairs))

    labels: list[bool] = []
    predictions: list[bool] = []
    errors: list[str] = []

    print("\n" + "=" * 72)
    print("  SENTINEL EVALUATION HARNESS")
    print("=" * 72)
    print(f"  Pairs: {len(pairs)} | Model: Groq / Llama-3")
    print("=" * 72 + "\n")

    start_time = time.time()

    for i, pair in enumerate(pairs, 1):
        pair_id = pair["id"]
        claim_a = pair["claim_a"]
        claim_b = pair["claim_b"]
        ground_truth = pair["label"]

        print(f"[{i:2d}/{len(pairs)}] {pair_id}")
        print(f"        A: {claim_a}")
        print(f"        B: {claim_b}")
        print(f"        Expected: {'CONTRADICTION' if ground_truth else 'NO CONTRADICTION'}", end="")

        try:
            predicted = evaluate_pair(claim_a, claim_b)
            labels.append(ground_truth)
            predictions.append(predicted)

            match = "✓" if predicted == ground_truth else "✗"
            print(f" | Predicted: {'CONTRADICTION' if predicted else 'NO CONTRADICTION'} [{match}]")
        except Exception as exc:
            print(f" | ERROR: {exc}")
            errors.append(pair_id)
            # Still count it — as a wrong prediction (conservative)
            labels.append(ground_truth)
            predictions.append(not ground_truth)  # Wrong by default

        print()

    elapsed = time.time() - start_time
    metrics = compute_metrics(labels, predictions)

    print("=" * 72)
    print("  RESULTS")
    print("=" * 72)
    print(f"  Precision : {metrics['precision']:.4f}  (TP={metrics['tp']}, FP={metrics['fp']})")
    print(f"  Recall    : {metrics['recall']:.4f}  (TP={metrics['tp']}, FN={metrics['fn']})")
    print(f"  F1 Score  : {metrics['f1']:.4f}")
    print(f"  Accuracy  : {metrics['accuracy']:.4f}  ({metrics['tp'] + metrics['tn']}/{len(labels)} correct)")
    print(f"  Errors    : {len(errors)}")
    print(f"  Time      : {elapsed:.1f}s ({elapsed/len(pairs):.1f}s per pair)")
    print("=" * 72)

    if errors:
        print(f"\n  Failed pairs: {', '.join(errors)}")

    # Return non-zero exit code if F1 is below a threshold (useful for CI)
    if metrics["f1"] < 0.5:
        print("\n  ⚠  F1 score below 0.5 — model performance needs attention.")
        sys.exit(1)


if __name__ == "__main__":
    main()
