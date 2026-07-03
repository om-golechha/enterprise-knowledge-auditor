from pydantic import BaseModel, Field
from enum import Enum
from typing import List

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ReportStatus(str, Enum):
    OPEN = "Open"
    UNDER_REVIEW = "Under Review"
    RESOLVED = "Resolved"
    IGNORED = "Ignored"

class ClaimClassification(str, Enum):
    BUSINESS_POLICY = "BUSINESS_POLICY"
    METADATA = "METADATA"
    LEGAL_DISCLAIMER = "LEGAL_DISCLAIMER"
    HEADER = "HEADER"
    FOOTER = "FOOTER"
    NOISE = "NOISE"

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
    evidence_span_a: str = ""
    evidence_span_b: str = ""
    confidence: float = Field(0.0, ge=0.0, le=100.0)
    rationale: str = ""
    title: str = ""

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

class ExtractedClaim(BaseModel):
    claim_text: str = Field(description="The exact extracted claim text")
    classification: ClaimClassification = Field(description="The classification of the claim (e.g., BUSINESS_POLICY, METADATA, NOISE)")

class ExtractedClaims(BaseModel):
    claims: List[ExtractedClaim] = Field(description="List of extracted claims from the text.")

class ContradictionResult(BaseModel):
    contradiction: bool = Field(description="True if a contradiction is detected, False otherwise")
    title: str = Field(description="A short, specific 3-5 word title summarizing the conflict. (e.g. 'Password Rotation Conflict')")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0", ge=0.0, le=1.0)
    evidence_spans: List[str] = Field(description="Exact quoted spans from the original text showing the contradiction")
    explanation: str = Field(description="Concise explanation comparing the policies. Do not use generic AI phrases.")
    business_risk: str = Field(description="Potential business impact if unresolved")
    recommendation: str = Field(description="Actionable recommendation to resolve the contradiction")

class RiskAssessmentResult(BaseModel):
    risk_level: RiskLevel = Field(description="The assessed risk level (low, medium, high)")
