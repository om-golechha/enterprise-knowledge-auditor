"""
Evaluation script for the Enterprise Knowledge Auditor.

Runs the full contradiction-detection pipeline against seed documents
and compares results to a ground-truth file.

Usage:
    python scripts/eval.py
"""
import os
import sys
import json
import uuid
from dotenv import load_dotenv

load_dotenv()

# Add backend to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), "../backend"))

from app.services import (
    DocumentIngestor,
    Chunker,
    VectorStore,
    ContradictionDetector,
    EvidenceVerifier,
)
from app.security import sanitize_text


def main():
    print("Starting Evaluation Pipeline...")
    corpus_id = "eval_" + str(uuid.uuid4())[:8]
    store = VectorStore(corpus_id)
    chunker = Chunker()

    seed_docs_dir = os.path.join(os.path.dirname(__file__), "../data/seed_docs")
    gt_file = os.path.join(os.path.dirname(__file__), "../data/ground_truth.json")

    if not os.path.isdir(seed_docs_dir):
        print(f"ERROR: Seed docs directory not found: {seed_docs_dir}")
        print("Run 'python generate_seed_data.py' first.")
        sys.exit(1)

    # 1. Ingest docs — uses the current PDF pipeline
    txt_files = [f for f in os.listdir(seed_docs_dir) if f.endswith(".txt")]
    if not txt_files:
        print("No .txt seed documents found. Skipping.")
        sys.exit(1)

    for filename in txt_files:
        filepath = os.path.join(seed_docs_dir, filename)
        # For .txt files we create LangChain Documents manually
        from langchain_core.documents import Document

        with open(filepath, "r") as f:
            text = f.read()

        text = sanitize_text(text)

        # Create a Document per file (simulating a single-page PDF)
        doc = Document(
            page_content=text,
            metadata={
                "document_id": filename,
                "filename": filename,
                "page": 0,
            },
        )

        claim_docs = chunker.process_and_extract_claims([doc])
        store.add_documents(claim_docs)
        print(f"  Ingested {filename}: {len(claim_docs)} claims extracted.")

    print(f"Total claims in vector store: {store.count()}")

    # 2. Run Detection
    detector = ContradictionDetector(store)
    candidates = detector.generate_candidates()
    print(f"Generated {len(candidates)} candidate pairs.")

    # 3. Verify
    system_found = []
    discarded = 0
    for cand in candidates:
        is_valid, resp, is_discarded = EvidenceVerifier.verify(cand)
        if is_discarded:
            discarded += 1
        elif is_valid and resp.is_contradiction:
            system_found.append(cand)

    print(
        f"Verified {len(system_found)} contradictions. "
        f"Discarded {discarded} unverified candidates."
    )

    # 4. Evaluate against Ground Truth
    if not os.path.isfile(gt_file):
        print(f"WARNING: Ground truth file not found: {gt_file}")
        return

    with open(gt_file, "r") as f:
        ground_truth = json.load(f)

    gt_contradictions = [g for g in ground_truth if g["is_contradiction"]]

    true_positives = 0
    false_positives = 0

    for sf in system_found:
        matched = False
        for gt in gt_contradictions:
            a_lower = gt["claim_a"].lower()
            b_lower = gt["claim_b"].lower()
            sf_a = sf.claim_a.lower()
            sf_b = sf.claim_b.lower()
            if (a_lower in sf_a and b_lower in sf_b) or (
                a_lower in sf_b and b_lower in sf_a
            ):
                matched = True
                break
        if matched:
            true_positives += 1
        else:
            false_positives += 1

    false_negatives = len(gt_contradictions) - true_positives

    precision = (
        true_positives / (true_positives + false_positives)
        if (true_positives + false_positives) > 0
        else 0.0
    )
    recall = (
        true_positives / (true_positives + false_negatives)
        if (true_positives + false_negatives) > 0
        else 0.0
    )
    f1 = (
        2 * (precision * recall) / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )

    print("\n--- Evaluation Results ---")
    print(f"True Positives (TP): {true_positives}")
    print(f"False Positives (FP): {false_positives}")
    print(f"False Negatives (FN): {false_negatives}")
    print(f"Precision: {precision:.2f}")
    print(f"Recall:    {recall:.2f}")
    print(f"F1 Score:  {f1:.2f}")


if __name__ == "__main__":
    main()
