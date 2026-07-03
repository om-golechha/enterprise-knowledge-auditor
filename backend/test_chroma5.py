from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
db = Chroma(embedding_function=embeddings)

docs = [
    Document(page_content=f"Doc {i}", metadata={"doc_id": str(i)})
    for i in range(150)
]
db.add_documents(docs)

results = db.get()
print("Total retrieved:", len(results["ids"]))
