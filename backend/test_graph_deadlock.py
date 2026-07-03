import asyncio
from app.graph import build_audit_graph
from app.services import VectorStore
import os
import logging

logging.basicConfig(level=logging.DEBUG)

async def test_graph():
    os.environ["GROQ_API_KEY"] = os.environ.get("GROQ_API_KEY", "")
    from langgraph.graph import StateGraph, END
    from app.graph import GraphState, verify_and_score
    
    workflow = StateGraph(GraphState)  # type: ignore[arg-type]
    workflow.add_node("verify", verify_and_score)
    workflow.set_entry_point("verify")
    workflow.add_edge("verify", END)
    graph = workflow.compile()
    
    # We need some dummy candidates
    from app.models import ContradictionCandidate
    initial_state = {
        "corpus_id": "test_corpus",
        "vector_store": None,
        "candidates": [],
        "reports": [],
        "discarded": 0,
    }
    c = ContradictionCandidate(
        chunk_a_id="a1", chunk_b_id="b1",
        claim_a="Passwords must be 12 chars",
        claim_b="Passwords must be 8 chars",
        doc_a="doc1", doc_b="doc2", page_a=1, page_b=1, topic="passwords", cosine_similarity=0.9
    )
    initial_state["candidates"] = [c] * 5  # 5 candidates
    
    print("Invoking graph...")
    try:
        final_state = await asyncio.to_thread(graph.invoke, initial_state)
        print("Graph finished!")
        print("Discarded:", final_state["discarded"])
        print("Reports:", len(final_state["reports"]))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_graph())
