import asyncio
from app.services import Chunker
from langchain_core.documents import Document

async def main():
    chunker = Chunker()
    docs = [Document(page_content="This is a dummy document with enough length to be processed by the LLM. " * 10)]
    try:
        res = chunker.process_and_extract_claims(docs)
        print("Success:", len(res))
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
