from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
db = Chroma(embedding_function=embeddings)

docs = [
    Document(page_content="Employees may work remotely for up to three days per week.", metadata={"doc_id": "1", "topic": "Food"}),
    Document(page_content="Employees are permitted to work remotely for a maximum of two days per week.", metadata={"doc_id": "2", "topic": "Food"}),
]
db.add_documents(docs)

results = db.similarity_search_with_relevance_scores(
    "Employees may work remotely for up to three days per week.",
    k=5
)
for r, score in results:
    print(r.metadata["doc_id"], score)
