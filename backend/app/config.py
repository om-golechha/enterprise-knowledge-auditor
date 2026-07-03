import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Embedding Settings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "groq")
    LLM_MODEL: str = "llama-3.1-8b-instant"
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""


    # Retrieval Settings
    TOP_K: int = 5
    SIMILARITY_THRESHOLD: float = 0.4

    # Security & Limits
    CORS_ORIGINS: str = "*"
    MAX_FILE_SIZE_MB: int = 50
    MAX_FILES_PER_REQUEST: int = 20
    MAX_REPORTS: int = 50
    API_KEY: str = ""


config = AppConfig()
