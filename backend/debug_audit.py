import asyncio
import logging
import sys

# Configure logging to stdout so we see the LLM reasoning
logging.basicConfig(level=logging.INFO, stream=sys.stdout)

# pyrefly: ignore [missing-module-attribute]
from app.services import AuditorPipeline

async def main():
    corpus_id = "corpus_1783091608902"
    print(f"Starting audit for {corpus_id}...")
    pipeline = AuditorPipeline()
    results = await pipeline.run_audit(corpus_id)
    print(f"Found {len(results)} contradictions")
    for r in results:
        print(f"Contradiction: {r.title} - {r.contradiction}")

if __name__ == "__main__":
    asyncio.run(main())
