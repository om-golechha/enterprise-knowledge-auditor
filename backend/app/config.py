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
    EMBEDDING_BATCH_SIZE: int = 32

    # LLM Settings
    LLM_MODEL: str = "llama-3.1-8b-instant"
    GROQ_API_KEY: str = ""
    LLM_TIMEOUT_SECONDS: int = 20
    LLM_MAX_RETRIES: int = 2
    LLM_MAX_TOKENS: int = 700
    LLM_VERIFY_CONCURRENCY: int = 1


    # Retrieval Settings
    TOP_K: int = 5
    SIMILARITY_THRESHOLD: float = 0.45
    MAX_CANDIDATES_TO_VERIFY: int = 50
    MIN_SHARED_TERMS: int = 1

    # Security & Limits
    CORS_ORIGINS: str = "*"
    MAX_FILE_SIZE_MB: int = 50
    MAX_FILES_PER_REQUEST: int = 20
    MAX_REPORTS: int = 50
    API_KEY: str = ""


config = AppConfig()
