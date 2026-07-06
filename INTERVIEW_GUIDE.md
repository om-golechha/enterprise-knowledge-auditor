# Sentinel Interview Guide

This guide is designed for a 10-15 minute technical interview to explain the engineering decisions behind Sentinel without buzzwords.

## Why ChromaDB?
ChromaDB was chosen for its zero-configuration local development experience. Since this project focuses on the contradiction logic rather than distributed infrastructure, ChromaDB allows us to embed a high-performance vector database directly into the Python process without requiring a separate server instance.

## Why SentenceTransformers?
Using `sentence-transformers/all-MiniLM-L6-v2` locally avoids API rate limits and network latency associated with sending millions of chunks to external APIs for embeddings. It strikes the perfect balance between speed and semantic quality for English text.

## Why Groq / Llama-3?
Groq provides ultra-low latency inference. For Sentinel, we generate dozens of candidate pairs and verification requests per document. Using a fast provider ensures the UI stays responsive ("WOW moment in 30 seconds") compared to standard LLM providers.

## Why FastAPI?
FastAPI is the industry standard for Python ML services. It provides automatic OpenAPI documentation, asynchronous endpoints for non-blocking I/O (essential when making LLM calls), and strict type validation via Pydantic.

## Why this chunking strategy?
We use LangChain's `RecursiveCharacterTextSplitter` with `chunk_size=400`, `chunk_overlap=50`, and separator priority `["\n\n", "\n", ". ", " "]`. This splits text at natural boundaries (double newlines first, then single newlines, then sentence boundaries, then words). After splitting, a heuristic claim extractor filters each chunk for actionable policy language (keywords like "must", "required", "prohibited") and tags it with a topic — all without LLM calls. The combination of small overlapping chunks and claim filtering means we catch boundary-spanning rules while keeping the input to the LLM focused on real policy statements.

## Why structured outputs (Pydantic)?
LLMs are unpredictable. By forcing the LLM to return strict JSON that maps to Pydantic models (like `VerificationResponse`), we guarantee type safety downstream. It ensures we always get a boolean for `is_contradiction` and a valid enum for `severity`.

## Why Docker?
Docker ensures the project is completely reproducible on the interviewer's machine. It eliminates the "it works on my machine" problem by bundling the exact Node.js and Python environments required.
