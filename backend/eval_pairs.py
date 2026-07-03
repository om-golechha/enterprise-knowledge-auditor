import asyncio
from pprint import pprint
from app.prompts import contradiction_verification_prompt
from app.services import get_llm
from app.models import ContradictionResult

llm = get_llm().with_structured_output(ContradictionResult)
chain = contradiction_verification_prompt | llm

pairs = [
    {
        "id": "pair_1_passwords",
        "claim_a": "Passwords must be rotated every 180 days.",
        "claim_b": "Passwords are hashed using bcrypt."
    },
    {
        "id": "pair_2_retention",
        "claim_a": "System logs must be retained for 365 days.",
        "claim_b": "Database backups must be retained for 90 days."
    },
    {
        "id": "pair_3_employees",
        "claim_a": "Employees are allowed to work remotely 3 days a week.",
        "claim_b": "ZS has more than 13,000 employees in over 35 offices worldwide."
    },
    {
        "id": "pair_4_auth",
        "claim_a": "All production microservices must use OAuth2 for authentication.",
        "claim_b": "Multi-factor authentication is Optional for all employees."
    },
    {
        "id": "pair_5_data",
        "claim_a": "All PII must be encrypted at rest using AES-256.",
        "claim_b": "Data is stored in PostgreSQL."
    }
]

async def evaluate():
    for pair in pairs:
        print(f"\nEvaluating {pair['id']}...")
        print(f"Claim A: {pair['claim_a']}")
        print(f"Claim B: {pair['claim_b']}")
        try:
            result = await chain.ainvoke({
                "claim_a": pair["claim_a"],
                "claim_b": pair["claim_b"]
            })
            print(f"Result (contradiction={result.contradiction}): {result.conflict_analysis}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(evaluate())
