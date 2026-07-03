import os
import logging

from langchain_groq import ChatGroq
from dotenv import load_dotenv

from app.config import config

logger = logging.getLogger(__name__)

# Belt-and-suspenders: Pydantic settings loads .env, but dotenv ensures
# the key is also available in os.environ for libraries that read it directly.
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))


def get_llm() -> ChatGroq:
    """Return a configured LangChain ChatGroq instance."""
    api_key = config.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to .env or set it as an environment variable."
        )

    # pyrefly: ignore [missing-argument]
    return ChatGroq(
        model_name=config.LLM_MODEL,
        api_key=api_key,
        temperature=0.0,
        max_retries=5,
        timeout=30,
    )
