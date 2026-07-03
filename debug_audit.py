import asyncio
import logging
import sys

# Configure logging to stdout so we see the LLM reasoning
logging.basicConfig(level=logging.INFO, stream=sys.stdout)

from backend.app.graph import build_audit_graph
from backend.main import get_vector_store, _validate_corpus_id

async def main():
    corpus_id = "corpus_1783091608902"
    print(f"Starting audit for {corpus_id}...")
    _validate_corpus_id(corpus_id)
    store = get_vector_store(corpus_id)
    print(f"Store has {store.count()} documents")

    graph = build_audit_graph()
    initial_state = {
        "corpus_id": corpus_id,
        "vector_store": store,
        "candidates": [],
        "reports": [],
        "discarded": 0,
    }
    
    final_state = await graph.ainvoke(initial_state)
    print(f"Candidates: {len(final_state['candidates'])}")
    print(f"Reports (Contradictions): {len(final_state['reports'])}")
    print(f"Discarded: {final_state['discarded']}")

    for r in final_state['reports']:
        print(f"Contradiction: {r.topic}")

if __name__ == "__main__":
    asyncio.run(main())
