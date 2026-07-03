from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
db = Chroma(embedding_function=embeddings)
docs = [Document(page_content=f"Doc {i}", metadata={"document_id": f"id_{i}"}) for i in range(15)]
db.add_documents(docs)

results = db.get(include=["metadatas", "documents"])
print(f"Total returned by get(): {len(results['documents'])}")
