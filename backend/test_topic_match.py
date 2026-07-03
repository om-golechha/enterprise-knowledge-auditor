import asyncio
from app.prompts import topic_match_prompt
from app.models import TopicMatchResult
from app.services import get_llm

async def main():
    llm = get_llm().with_structured_output(TopicMatchResult)
    chain = topic_match_prompt | llm
    
    pairs = [
        (
            "are rotated every 12 months or immediately upon suspected compromise.",
            "Employees working remotely must maintain a stable internet connection of at least 25 Mbps"
        ),
        (
            "Changes in applicable law trigger fast-tracking of periods outside the standard annual cycle.",
            "are rotated every 12 months or immediately upon suspected compromise."
        ),
        (
            "Exceptions require joint approval from the Head of Cloud Platform Engineering and the CISO, are valid for a maximum of 6 months, and are reassessed at each quarterly governance meeting.",
            "All new hires are subject to a 90-calendar-day probationary period, during which either party may terminate employment with 5 business days' written notice."
        ),
        (
            "Passwords must be rotated every 180 days.",
            "Passwords must be rotated every 90 days."
        )
    ]
    
    for a, b in pairs:
        print(f"\nComparing:")
        print(f"A: {a}")
        print(f"B: {b}")
        res = await chain.ainvoke({"claim_a": a, "claim_b": b})
        print(f"Result: {res.is_same_subject} - {res.reasoning}")

if __name__ == "__main__":
    asyncio.run(main())
