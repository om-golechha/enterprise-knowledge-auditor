import sys
import asyncio
from app.services import DocumentIngestor
import os

corpus_dir = "uploads/corpus_1783154028018"
for f in ["first.pdf", "second.pdf", "third.pdf"]:
    path = os.path.join(corpus_dir, f)
    docs = DocumentIngestor.load_pdf(path, f)
    print(f"--- {f} ---")
    for d in docs:
        print(d.page_content.strip())
    print()
