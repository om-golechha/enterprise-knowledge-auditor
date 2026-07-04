import sys
import asyncio
from app.services import VectorStore, DocumentIngestor, get_embeddings
import os

async def main():
    corpus_id = "corpus_1783154028018"
    vs = VectorStore(corpus_id)
    
    docs = vs.get_all_documents()
    print("total docs", len(docs))
    
    # query chunks from third.pdf
    third_docs = [d for d in docs if "third.pdf" in str(d.metadata.get("document_id", ""))]
    
    for doc in third_docs:
        print("\n--- chunk:", doc.page_content[:50], "---")
        res = vs.similarity_search_with_score(doc.page_content, k=10, filter={"document_id": {"$ne": doc.metadata["document_id"]}})
        for r, dist in res:
            sim = 1.0 - (dist/2.0)
            doc_id = r.metadata.get("document_id")
            if "third.pdf" not in doc_id:
                print(f"{doc_id}: sim={sim:.3f} | {r.page_content[:50]}")

asyncio.run(main())
