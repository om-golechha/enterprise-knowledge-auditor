from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
db = Chroma(embedding_function=embeddings)

docs = [
    Document(page_content="Apple is a fruit.", metadata={"doc_id": "1", "topic": "Food"}),
    Document(page_content="Apple is a tech company.", metadata={"doc_id": "2", "topic": "Food"}),
    Document(page_content="Banana is a fruit.", metadata={"doc_id": "3", "topic": "Food"})
]
db.add_documents(docs)

filter_dict = {
    "$and": [
        {"doc_id": {"$ne": "1"}},
        {"topic": {"$eq": "Food"}}
    ]
}

results = db.similarity_search_with_relevance_scores(
    "Apple is a fruit.",
    k=5,
    filter=filter_dict
)
for r, score in results:
    print(r.metadata["doc_id"], score)
