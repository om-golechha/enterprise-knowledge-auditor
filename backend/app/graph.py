import logging
import traceback
from typing import List, Any
from typing_extensions import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.models import (
    ContradictionCandidate,
    ContradictionReport,
    ReportStatus,
)
from app.services import VectorStore, ContradictionDetector, EvidenceVerifier, RiskScorer

logger = logging.getLogger(__name__)


class GraphState(TypedDict):
    corpus_id: str
    vector_store: VectorStore          # VectorStore instance passed from the caller
    candidates: List[ContradictionCandidate]
    reports: List[ContradictionReport]
    discarded: int


def retrieve_candidates(state: GraphState) -> dict:
    """Generate contradiction candidate pairs via topic-filtered vector similarity."""
    logger.info("Graph Node: retrieve_candidates")

    # Use the VectorStore passed through state — NOT a new empty one
    store: VectorStore = state["vector_store"]
    detector = ContradictionDetector(store)
    candidates = detector.generate_candidates()

    logger.info("Generated %d candidate pairs", len(candidates))
    return {"candidates": candidates}


# Global thread pool to bound LLM verification concurrency across all requests
llm_verify_executor = ThreadPoolExecutor(max_workers=3)

def verify_and_score(state: GraphState) -> dict:
    """Verify candidates with LLM and score risk for confirmed contradictions."""
    logger.info("Graph Node: verify_and_score (%d candidates)", len(state["candidates"]))
    reports: list[ContradictionReport] = []
    discarded = 0

    def _verify_candidate(c: ContradictionCandidate):
        is_valid, verification, is_discarded = EvidenceVerifier.verify(c)
        risk = None
        if not is_discarded and is_valid and verification.is_contradiction:
            title = verification.title or c.topic
            risk = RiskScorer.score(
                title,
                verification.rationale,
                c.claim_a,
                c.claim_b,
            )
        return (is_valid, verification, is_discarded, risk), c

    futures = {llm_verify_executor.submit(_verify_candidate, c): c for c in state["candidates"]}

    for future in as_completed(futures):
        candidate = futures[future]
        try:
            (is_valid, verification, is_discarded, risk), _ = future.result()

            if is_discarded:
                discarded += 1
                continue

            if is_valid and verification.is_contradiction:
                title = verification.title or candidate.topic

                reports.append(
                    ContradictionReport(
                        claim_a=candidate.claim_a,
                        source_doc_a=candidate.doc_a,
                        page_a=candidate.page_a,
                        claim_b=candidate.claim_b,
                        source_doc_b=candidate.doc_b,
                        page_b=candidate.page_b,
                        topic=title,
                        confidence=verification.confidence,
                        risk_level=risk,
                        status=ReportStatus.OPEN,
                        evidence_span_a=verification.evidence_span_a,
                        evidence_span_b=verification.evidence_span_b,
                        rationale=verification.rationale,
                    )
                )
        except Exception:
            logger.error(
                "Error verifying candidate '%s...': %s",
                candidate.claim_a[:40],
                traceback.format_exc(),
            )
            discarded += 1

    logger.info(
        "Verification complete: %d confirmed, %d discarded", len(reports), discarded
    )
    return {"reports": reports, "discarded": discarded}


def build_audit_graph():
    workflow = StateGraph(GraphState)  # type: ignore[arg-type]
    workflow.add_node("retrieve", retrieve_candidates)
    workflow.add_node("verify", verify_and_score)

    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "verify")
    workflow.add_edge("verify", END)

    return workflow.compile()
