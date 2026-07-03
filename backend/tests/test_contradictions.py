import pytest
import asyncio
from app.prompts import contradiction_verification_prompt
from app.services import get_llm
from app.models import ContradictionResult

@pytest.fixture
def verification_chain():
    llm = get_llm().with_structured_output(ContradictionResult, method="json_mode")
    return (contradiction_verification_prompt | llm).with_retry(stop_after_attempt=3)

@pytest.mark.asyncio
async def test_shared_topic_different_requirements(verification_chain):
    # Rule A and Rule B govern DIFFERENT things (system logs vs database backups)
    claim_a = "System logs must be retained for 365 days."
    claim_b = "Database backups must be retained for 90 days."
    
    result = await verification_chain.ainvoke({"claim_a": claim_a, "claim_b": claim_b})
    assert result.contradiction is False

@pytest.mark.asyncio
async def test_shared_topic_different_scope(verification_chain):
    # Rule A and Rule B govern the same concept but different things
    claim_a = "Passwords must be rotated every 180 days."
    claim_b = "Passwords are hashed using bcrypt."
    
    result = await verification_chain.ainvoke({"claim_a": claim_a, "claim_b": claim_b})
    assert result.contradiction is False

@pytest.mark.asyncio
async def test_shared_topic_different_entity(verification_chain):
    claim_a = "Employees are allowed to work remotely 3 days a week."
    claim_b = "ZS has more than 13,000 employees in over 35 offices worldwide."
    
    result = await verification_chain.ainvoke({"claim_a": claim_a, "claim_b": claim_b})
    assert result.contradiction is False

@pytest.mark.asyncio
async def test_optional_vs_mandatory_different_things(verification_chain):
    claim_a = "All production microservices must use OAuth2 for authentication."
    claim_b = "Multi-factor authentication is Optional for all employees."
    
    result = await verification_chain.ainvoke({"claim_a": claim_a, "claim_b": claim_b})
    assert result.contradiction is False
    
@pytest.mark.asyncio
async def test_technology_vs_encryption(verification_chain):
    claim_a = "All PII must be encrypted at rest using AES-256."
    claim_b = "Data is stored in PostgreSQL."
    
    result = await verification_chain.ainvoke({"claim_a": claim_a, "claim_b": claim_b})
    assert result.contradiction is False

@pytest.mark.asyncio
async def test_true_contradiction_numeric(verification_chain):
    # Rule A and Rule B govern the EXACT SAME thing but have different requirements
    claim_a = "Passwords must be rotated every 180 days."
    claim_b = "Passwords must be rotated every 90 days."
    
    result = await verification_chain.ainvoke({"claim_a": claim_a, "claim_b": claim_b})
    assert result.contradiction is True

@pytest.mark.asyncio
async def test_true_contradiction_mandatory(verification_chain):
    claim_a = "Multi-factor authentication is Optional for all employees."
    claim_b = "Multi-factor authentication is Mandatory for all employees."
    
    result = await verification_chain.ainvoke({"claim_a": claim_a, "claim_b": claim_b})
    assert result.contradiction is True
