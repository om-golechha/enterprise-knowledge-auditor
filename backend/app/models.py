from pydantic import BaseModel, Field
from enum import Enum
from typing import List, Any
from pydantic import field_validator

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ReportStatus(str, Enum):
    OPEN = "Open"
    UNDER_REVIEW = "Under Review"
    RESOLVED = "Resolved"
    IGNORED = "Ignored"


class ContradictionCandidate(BaseModel):
    """Internal model for passing candidates from Detector to Verifier"""
    chunk_a_id: str
    chunk_b_id: str
    claim_a: str
    claim_b: str
    doc_a: str
    doc_b: str
    page_a: int
    page_b: int
    topic: str
    cosine_similarity: float

class VerificationResponse(BaseModel):
    """Structured output expected from the LLM."""
    is_contradiction: bool
    conflict_analysis: str
    evidence_span_a: str
    evidence_span_b: str
    confidence: float
    rationale: str

class TopicMatchResult(BaseModel):
    is_same_subject: bool = Field(description="True if both claims govern the EXACT SAME subject matter/context.")
    reasoning: str = Field(description="Explanation of why they share or do not share the exact same context.")

class ContradictionReport(BaseModel):
    """Final output schema for verified contradictions."""
    claim_a: str
    source_doc_a: str
    page_a: int
    claim_b: str
    source_doc_b: str
    page_b: int
    topic: str
    confidence: float
    risk_level: RiskLevel
    status: ReportStatus
    evidence_span_a: str
    evidence_span_b: str
    rationale: str

class AuditReport(BaseModel):
    """Full report returned by /audit"""
    audit_id: str
    corpus_id: str
    total_documents: int
    total_claims_extracted: int
    candidates_checked: int
    contradictions_found: int
    discarded_unverified: int
    health_score: float
    contradictions: List[ContradictionReport]

class ReportStatusUpdate(BaseModel):
    status: ReportStatus


class ContradictionResult(BaseModel):
    contradiction: bool = Field(description="True ONLY if following one rule makes it literally impossible to comply with the other rule at the same time. If they govern different scopes, subjects, or are complementary, this MUST be False.")
    conflict_analysis: str = Field(description="Logical analysis of whether these two rules are mutually exclusive")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0 based on the clarity of the conflict", ge=0.0, le=1.0)
    evidence_spans: List[Any] = Field(description="Exact quoted spans from the original text showing the contradiction")

    @field_validator('conflict_analysis', mode='before')
    def parse_conflict_analysis(cls, v):
        if isinstance(v, list):
            return " ".join([str(item) for item in v])
        return str(v)

    @field_validator('evidence_spans', mode='before')
    def parse_spans(cls, v):
        if not isinstance(v, list):
            return []
        parsed = []
        for item in v:
            if isinstance(item, dict):
                parsed.append(item.get("span", str(item)))
            else:
                parsed.append(str(item))
        return parsed

class RiskAssessmentResult(BaseModel):
    risk_level: RiskLevel = Field(description="The assessed risk level (low, medium, high)")
