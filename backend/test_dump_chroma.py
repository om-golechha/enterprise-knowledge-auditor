import requests
import uuid

corpus_id = "test-corpus-6d29207c"  # from my previous run, wait! the DB is in-memory! It's gone.
# I need to re-run the ingest and audit, but use the Python functions directly so I can print the Chroma contents.

import os
from app.services import DocumentIngestor, Chunker, VectorStore, ContradictionDetector
from app.config import config

corpus_id = "test-debug"
store = VectorStore(corpus_id)
chunker = Chunker()

files = [
    ("pdf1.pdf", "uploads/713030c1-4794-4b56-8ba9-a1ef0d5fb8de/pdf1.pdf"),
    ("pdf2.pdf", "uploads/713030c1-4794-4b56-8ba9-a1ef0d5fb8de/pdf2.pdf"),
    ("pdf3.pdf", "uploads/713030c1-4794-4b56-8ba9-a1ef0d5fb8de/pdf3.pdf"),
]

for filename, filepath in files:
    docs = DocumentIngestor.load_pdf(filepath, doc_id=f"{corpus_id}/{filename}")
    claim_docs = chunker.process_and_extract_claims(docs)
    store.add_documents(claim_docs)

all_docs = store.get_all_documents()
print("Total documents in DB:", len(all_docs))
for doc in all_docs:
    print(f"[{doc.metadata.get('document_id')}] (Topic: {doc.metadata.get('topic')}) {doc.page_content[:50]}")

detector = ContradictionDetector(store)
candidates = detector.generate_candidates()
print(f"Candidates generated: {len(candidates)}")
for c in candidates:
    print(f"Pair: {c.doc_a} vs {c.doc_b} (Score: {c.cosine_similarity}) Topic: {c.topic}")
