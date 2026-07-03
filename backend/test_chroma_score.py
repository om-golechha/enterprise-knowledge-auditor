import sys
from app.services import VectorStore
from langchain_core.documents import Document

def main():
    vs = VectorStore("corpus_1783086288022")
    docs = vs.get_all_documents()
    if not docs:
        print("No docs")
        return
    
    doc = docs[0]
    res = vs.db.similarity_search_with_score(doc.page_content, k=2)
    print("Scores:")
    for d, s in res:
        print(f"Distance: {s}, converted to cosine: {1 - s/2}")

if __name__ == "__main__":
    main()
