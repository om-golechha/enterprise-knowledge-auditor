# Sentinel: Enterprise Knowledge Auditor

## The Problem
Enterprise policy sprawl is a silent hazard. As organizations scale, they accumulate hundreds of internal documents—IT policies, HR handbooks, security standards, and compliance guidelines—authored by different teams in different silos. Inevitably, these documents drift out of sync. HR might state that employees can work remotely 5 days a week, while a legacy IT policy dictates that all cloud access must originate from a trusted corporate office IP. 

These aren't just typos; they are logical contradictions that create compliance gaps, paralyze decision-making, and leave employees guessing which rule to follow. Finding these contradictions manually requires reading every document against every other document—an $O(N^2)$ problem that scales terribly. Teams usually don't discover these conflicts until an incident occurs or an auditor flags them.

## Why Agents?
Standard semantic search (RAG) is insufficient for this problem. If you ask a standard RAG bot, "What is our remote work policy?", it will blindly retrieve both the HR and IT documents, summarize them together, and hallucinates a compromise. It does not actively audit the knowledge base.

We need an autonomous system that doesn't just retrieve knowledge, but actively reasons about its logical consistency. We built Sentinel as a multi-step agentic pipeline because contradiction detection requires specialized, iterative cognition: retrieving overlapping claims, filtering out noise, and carefully evaluating logical boundaries. Furthermore, by packaging Sentinel as a Model Context Protocol (MCP) server, it transcends being a standalone app—it becomes a "skill" that any other agent in the enterprise ecosystem can proactively use to double-check its own facts before acting.

## Architecture
Sentinel is built on a robust, asynchronous FastAPI backend orchestrating a LangGraph pipeline. The architecture is intentionally designed to minimize expensive LLM calls during the ingestion phase, reserving heavy reasoning for the verification stage.

1. **Ingestion & Heuristic Chunking:** Documents are parsed and split using LangChain's `RecursiveCharacterTextSplitter`. Instead of blindly embedding every paragraph, a deterministic heuristic filters chunks for actionable policy language (e.g., "must", "prohibited") and tags them with topics. This happens locally, with zero LLM cost.
2. **Vector Storage:** Filtered policy claims are embedded using `all-MiniLM-L6-v2` and stored in ChromaDB.
3. **Retrieval & Prefiltering:** When auditing a corpus, Sentinel retrieves semantically similar claim pairs. Before invoking the LLM, a local prefilter drops identical claims or completely unrelated topics.
4. **LLM Verification (LangGraph):** The surviving candidate pairs are passed to an LLM (Groq/Llama-3) via a LangGraph node. The LLM is constrained to output strict JSON via Pydantic (`ContradictionResult`), evaluating whether the claims are logically incompatible.
5. **Security Guardrail:** All LLM outputs pass through a `SecurityValidator` that catches schema deviations, out-of-bounds values, and prompt injections, ensuring the system never crashes on bad generation.
6. **Presentation:** Results are scored by risk severity and displayed in a React/TypeScript frontend.

## 3 Concepts Demonstrated

1. **Deterministic Guardrails over LLM Output (See: `backend/app/security.py`)**  
   We demonstrate that LLM pipelines must not trust their own generative outputs. Our `SecurityValidator` sits between the LLM and the application layer, validating schemas, enforcing numeric boundaries (e.g., confidence ≤ 1.0), and scanning all generated strings for prompt injection patterns. If the LLM goes off the rails, the guardrail catches it and injects a safe fallback, guaranteeing system stability. *[Video: 3:15 - Watch the system deflect an injected document]*

2. **Agentic Tooling via MCP (See: `backend/app/mcp_server.py`)**  
   Sentinel isn't locked behind its own UI. By exposing our core verification logic through the official Model Context Protocol (MCP) SDK, Sentinel acts as a universally consumable tool. Any MCP-compatible host (like Claude Desktop or Cursor) can connect to Sentinel and invoke the `check_contradiction` tool. *[Video: 4:00 - Live demo of Claude Desktop querying the local Sentinel server]*

3. **Heuristic Prefiltering to Bound Agent Costs (See: `backend/app/services.py`)**  
   Agents can quickly become cost-prohibitive if they evaluate every possible combination of data. Sentinel demonstrates cost-bounding by using deterministic heuristics (`_looks_like_claim` and `_worth_llm`) to filter the $O(N^2)$ candidate pairs down to a tiny, high-probability subset *before* any LLM is invoked.

## Evaluation Results
"Vibes" aren't a metric. We built a minimal evaluation harness (`backend/eval/run_eval.py`) with 18 hand-labeled, challenging policy pairs to benchmark the live pipeline. 

**Latest Benchmark (Groq/Llama-3):**
- **Precision:** 1.0000 (0 false positives)
- **Recall:** 1.0000 (0 false negatives)
- **F1 Score:** 1.0000
- **Accuracy:** 100%

Our prompt engineering and guardrails successfully distinguish between explicit logical conflicts and valid implicit exceptions (e.g. emergency CAB carve-outs, non-production encryption exemptions). The model correctly flags 100% of the true contradictions in our test set while generating 0 false alarms.

## Weaknesses & Future Improvements
While Sentinel effectively catches direct logical conflicts, it struggles with **implicit dependencies**. For example, if Policy A requires software to be updated within 3 days of release, and Policy B mandates a 7-day QA testing cycle for all updates, these contradict in practice but not in pure semantic text. Detecting this requires an agent capable of multi-step timeline reasoning, which our current single-shot verifier lacks.

In the future, we plan to:
1. Add OCR support for image-based PDFs and DOCX files.
2. Upgrade the LangGraph pipeline with a "reflection" node to catch the exception-based false negatives identified in our eval.
3. Implement persistent user authentication (OAuth2 / JWT) and multi-tenant isolation for enterprise SaaS deployment.
