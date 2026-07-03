from pydantic import BaseModel, Field
class ContradictionResult(BaseModel):
    is_same_subject: bool = Field(False, description="True ONLY if both claims govern the EXACT SAME subject matter/context. (e.g. both about password length)")
    reasoning: str = Field("", description="Explanation of why they share or do not share the exact same context.")
    premise_a_summary: str = Field("", description="Objective summary of the rule established by Claim A")
    premise_b_summary: str = Field("", description="Objective summary of the rule established by Claim B")
    conflict_analysis: str = Field("", description="Logical analysis of whether these two rules are mutually exclusive")
    contradiction: bool = Field(False, description="True ONLY if following one rule makes it literally impossible to comply with the other rule at the same time. If they govern different scopes, subjects, or are complementary, this MUST be False.")
    title: str = Field("Potential Conflict", description="A short, specific 3-5 word title summarizing the conflict. (e.g. 'Password Rotation Conflict')")
    confidence: float = Field(0.0, description="Confidence score between 0.0 and 1.0 based on the clarity of the conflict", ge=0.0, le=1.0)
    evidence_spans: list[str] = Field(default_factory=list, description="Exact quoted spans from the original text showing the contradiction")
    business_risk: str = Field("low", description="Potential business impact if unresolved")
    recommendation: str = Field("", description="Actionable recommendation to resolve the contradiction")

try:
    print(ContradictionResult.model_validate({}))
except Exception as e:
    import traceback
    traceback.print_exc()
