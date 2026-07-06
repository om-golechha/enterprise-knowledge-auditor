# Sentinel - Enterprise Knowledge Auditor

## 1. Mission
Sentinel exists to solve the problem of silent, catastrophic policy drift. In large enterprises, security and compliance documents are written by different teams, updated at different times, and stored in sprawling repositories. This guarantees that contradictory rules—which create compliance liabilities and operational paralysis—will emerge unnoticed. Sentinel is not a generic RAG chatbot designed for Q&A; it is a purpose-built, autonomous auditor. We use a multi-agent approach rather than a single LLM call because auditing requires a pipeline of distinct, specialized steps: precise extraction, semantic retrieval, and rigorous verification. Agents provide the necessary orchestration to systematically pre-filter signals and verify conflicts against strict logical definitions without human intervention.

## 2. Tech Stack
* **FastAPI**: Serves as the high-performance, asynchronous backbone for our backend APIs and MCP server wrapper.
* **LangGraph**: Orchestrates the multi-step verification pipeline (retrieve → verify nodes), enforcing deterministic flow control over the auditing process.
* **ChromaDB**: Provides fast, local vector storage for our policy chunks, enabling semantic search and conflict-signal prefiltering.
* **SentenceTransformers**: Specifically `all-MiniLM-L6-v2`, used for generating lightweight, rapid embeddings during the ingestion and retrieval phases without relying on external API calls.
* **Groq / Llama-3**: Powers the high-speed, low-latency LLM inference required to evaluate candidate pairs for logical contradictions.
* **Pydantic**: Enforces strict structured outputs from the LLM and validates all data models, ensuring the pipeline never crashes on malformed JSON.
* **React / TypeScript**: Delivers a robust, type-safe frontend dashboard for users to review the categorized contradiction reports and severity scores.

## 3. Non-Negotiables
* **Zero Temperature**: All verification LLM calls must run at `temperature=0` to guarantee deterministic, reproducible compliance auditing.
* **Strict Validation**: All LLM output must pass Pydantic validation (via the `SecurityValidator`) before reaching the frontend or proceeding downstream. 
* **No Raw JSON in DB**: No raw, unvalidated LLM JSON is ever written to the database; it must be sanitized and cast to our exact schemas.
* **No Secrets in Source**: No API keys, tokens, or credentials will ever be committed to source control or hardcoded in any file.
