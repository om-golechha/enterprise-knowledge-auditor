import sys
sys.path.insert(0, '/Users/omgolechha/Downloads/assistants/backend')
from app.services import VectorStore
from langchain_core.documents import Document

try:
    print("Initializing VectorStore...")
    vs = VectorStore(corpus_id="test_perf")
    docs = [Document(page_content="test doc " + str(i), metadata={"claim_id": str(i)}) for i in range(10)]
    print("Adding documents...")
    vs.db.add_documents(docs)
    print("Done!")
except Exception as e:
    print("Error:", e)
