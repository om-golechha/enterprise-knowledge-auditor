"""
MCP Server for Sentinel — Enterprise Knowledge Auditor.

WHY MCP? The Model Context Protocol is an open standard that lets any
MCP-compatible AI host (Claude Desktop, Cursor, custom agent frameworks)
call Sentinel as a tool. This means judges, partners, or downstream agents
can invoke contradiction-checking directly — Sentinel becomes a composable
building block, not a walled-off demo. One server, infinite integrations.

This file is a THIN WRAPPER. All actual logic lives in graph.py and
services.py. We import and call existing functions; nothing is reimplemented.
"""

import json
import logging
import sys

from mcp.server.fastmcp import FastMCP

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sentinel.mcp")

# ---------------------------------------------------------------------------
# MCP Server Instance
# ---------------------------------------------------------------------------
mcp = FastMCP(
    name="sentinel",
    instructions=(
        "Sentinel is an Enterprise Knowledge Auditor. It detects contradictions "
        "in policy documents. Use `check_contradiction` to verify whether two "
        "specific claims contradict each other. Use `audit_corpus` to run a full "
        "audit on an already-ingested corpus of documents."
    ),
)


# ---------------------------------------------------------------------------
# Tool 1: check_contradiction
# ---------------------------------------------------------------------------
@mcp.tool()
def check_contradiction(claim_a: str, claim_b: str) -> str:
    """Check whether two policy claims contradict each other.

    This tool sends both claims through Sentinel's LLM-powered verification
    pipeline (the same one the web UI uses) and returns a structured JSON
    result with contradiction status, confidence, analysis, and evidence spans.

    Args:
        claim_a: The first policy claim / rule text.
        claim_b: The second policy claim / rule text.

    Returns:
        JSON-serialized ContradictionResult with fields: contradiction (bool),
        conflict_analysis (str), confidence (float), evidence_spans (list[str]).
    """
    # Import at call-time so the module can be imported without loading the
    # full model stack (embeddings, LLM) until actually needed.
    from app.models import ContradictionResult
    from app.llm import get_llm
    from app.prompts import contradiction_verification_prompt

    logger.info("MCP check_contradiction: '%s...' vs '%s...'", claim_a[:60], claim_b[:60])

    llm = get_llm().with_structured_output(ContradictionResult, method="json_mode")
    chain = (contradiction_verification_prompt | llm).with_retry(stop_after_attempt=3)

    result = chain.invoke({"claim_a": claim_a, "claim_b": claim_b})

    # result is a ContradictionResult Pydantic model — serialize to JSON.
    return result.model_dump_json(indent=2)


# ---------------------------------------------------------------------------
# Tool 2: audit_corpus
# ---------------------------------------------------------------------------
@mcp.tool()
def audit_corpus(corpus_id: str) -> str:
    """Run a full contradiction audit on an already-ingested document corpus.

    This invokes the complete LangGraph pipeline (retrieve candidates →
    verify with LLM → score risk) on the specified corpus and returns the
    list of confirmed ContradictionReport items as JSON.

    The corpus must have been previously ingested via the /ingest API endpoint
    so that embeddings exist in ChromaDB.

    Args:
        corpus_id: The identifier of the corpus to audit (e.g. "my-policies").

    Returns:
        JSON object with keys: contradictions_found (int), discarded (int),
        and contradictions (list of ContradictionReport dicts).
    """
    from app.graph import build_audit_graph
    from app.services import VectorStore

    logger.info("MCP audit_corpus: corpus_id=%s", corpus_id)

    store = VectorStore(corpus_id)
    if store.count() == 0:
        return json.dumps({"error": f"Corpus '{corpus_id}' is empty or not found. Ingest documents first."})

    graph = build_audit_graph()
    initial_state = {
        "corpus_id": corpus_id,
        "vector_store": store,
        "candidates": [],
        "reports": [],
        "discarded": 0,
    }

    final_state = graph.invoke(initial_state)

    reports = final_state["reports"]
    discarded = final_state["discarded"]

    # Serialize the list of ContradictionReport Pydantic models to JSON.
    return json.dumps(
        {
            "contradictions_found": len(reports),
            "discarded": discarded,
            "contradictions": [r.model_dump(mode="json") for r in reports],
        },
        indent=2,
    )


# ---------------------------------------------------------------------------
# Standalone entry point — run with: python -m app.mcp_server
# Judges can test via any MCP-compatible host (e.g. Claude Desktop, mcp CLI).
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    logger.info("Starting Sentinel MCP server on stdio transport...")
    logger.info("Connect any MCP-compatible host to interact with Sentinel tools.")
    mcp.run(transport="stdio")
