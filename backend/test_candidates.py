import asyncio
from app.services import VectorStore, ContradictionDetector
from app.config import config
import sys

def main():
    corpus_id = "test_corpus"
    if len(sys.argv) > 1:
        corpus_id = sys.argv[1]
    
    vs = VectorStore(corpus_id)
    print(f"Total documents in VS: {vs.count()}")
    
    if vs.count() > 0:
        docs = vs.get_all_documents()
        doc = docs[0]
        print(f"Sample doc_id: {doc.metadata.get('document_id')}")
        
        detector = ContradictionDetector(vs)
        candidates = detector.generate_candidates()
        print(f"Generated {len(candidates)} candidates.")

if __name__ == "__main__":
    main()
