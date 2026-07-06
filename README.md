# Enterprise Knowledge Auditor

![Enterprise Knowledge Auditor](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

A production-ready Enterprise Knowledge Auditor that extracts, analyzes, and detects contradictions across large document corpora using a state-of-the-art AI pipeline.

## 🌟 Project Overview

The Enterprise Knowledge Auditor enables organizations to ingest massive amounts of PDF documents and automatically detect contradictory statements or discrepancies. It leverages a modern frontend dashboard for visualizing findings and a robust Python backend driven by LangChain, LangGraph, and ChromaDB to perform deep semantic analysis.

## 🚀 Features

- **PDF Ingestion & Extraction**: Automatically process and extract text from complex documents.
- **Semantic Retrieval**: Uses Sentence Transformers and ChromaDB to find related claims.
- **Contradiction Analysis**: LangGraph-powered AI pipeline to evaluate and cross-reference statements.
- **Interactive Dashboard**: Modern, glassmorphic UI built with React and Framer Motion.
- **Evidence Viewer**: Side-by-side PDF viewer with exact page references.
- **Enterprise Ready**: Clean architecture, configurable environment variables, and secure API boundaries.

## 🏗️ Architecture

The system is divided into two primary components:

1. **Frontend**: A Vite-powered React application with dynamic routing, context-based state management, and enterprise-grade styling using Tailwind CSS.
2. **Backend**: A FastAPI server that orchestrates the AI pipeline (LangChain, LangGraph) and manages document storage and vector embeddings (ChromaDB).

## 🛠️ Tech Stack

**Frontend:**

- React 19
- Vite
- Tailwind CSS
- Framer Motion
- React-PDF
- Lucide React

**Backend:**

- FastAPI (Python)
- LangChain & LangGraph
- ChromaDB
- Sentence Transformers
- Groq (LLM Inference)

## 📦 Installation

Ensure you have Node.js (v18+) and Python 3.10+ installed.

### Clone the repository

```bash
git clone https://github.com/om-golechha/enterprise-knowledge-auditor.git
cd enterprise-knowledge-auditor
```

### Setup Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
# Recommended: uv pip install -r requirements.txt (faster resolution). Plain pip works but may be slow to resolve dependencies.
uv pip install -r requirements.txt
```

### Setup Frontend

```bash
cd frontend
npm install
```

## ⚙️ Environment Variables

Copy the `.env.example` file to `.env` in the root of the project:

```bash
cp .env.example .env
```

Ensure the following variables are set:

```env
# Frontend Variables
VITE_API_URL=http://localhost:8000
VITE_API_KEY=your_secret_api_key

# Backend Variables
API_KEY=your_secret_api_key
GROQ_API_KEY=your_groq_api_key
```

## 📁 Folder Structure

```text
.
├── backend/                # FastAPI application and AI logic
│   ├── app/                # Core backend modules (graph, llm, pipeline)
│   ├── requirements.txt    # Python dependencies
│   └── main.py             # FastAPI entry point
├── frontend/               # React Dashboard
│   ├── src/                # UI Components, Pages, and Context
│   ├── package.json        # Node dependencies
│   └── vite.config.ts      # Vite configuration
├── .env.example            # Environment variables template
└── README.md               # Project documentation
```

## 🚀 How to Run

### 1. Start the Backend Server

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8001
```

### 2. Start the Frontend Development Server

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5175` in your browser.

## 🧠 AI Pipeline

The AI pipeline utilizes **LangGraph** to process documents iteratively:

1. **Extract**: Text and metadata are pulled from PDFs using `pypdf`.
2. **Chunk & Tag**: Text is split using `RecursiveCharacterTextSplitter` (`chunk_size=400`, `chunk_overlap=50`, separators: `["\n\n", "\n", ". ", " "]`). Each chunk is filtered for actionable policy language and tagged with a topic via keyword heuristics — no LLM calls during ingest.
3. **Embed**: Tagged claim chunks are embedded using `all-MiniLM-L6-v2` and stored in ChromaDB.
4. **Retrieve**: Semantic search with conflict-signal prefiltering identifies potentially contradictory claim pairs across documents.
5. **Verify**: An LLM (Groq / Llama-3) evaluates each candidate pair for logical contradictions, returning structured JSON via Pydantic.
6. **Score & Report**: Confirmed contradictions are risk-scored deterministically and formatted into structured JSON for the frontend dashboard.

## 🔒 Security

Sentinel includes a **SecurityValidator** guardrail (`backend/app/security.py`) that sits between raw LLM JSON output and the rest of the pipeline. It enforces three checks:

1. **Schema Conformance** — Every LLM response is validated against a Pydantic model. Wrong types, missing fields, extra fields, and out-of-range values (e.g., confidence > 1.0) are caught and rejected.
2. **Prompt Injection Detection** — All string fields in LLM output are scanned for known injection patterns (e.g., "ignore all previous instructions"). If detected, the entire response is rejected.
3. **Safe Fallback** — On any validation failure, a clearly-marked safe default is returned. The pipeline never crashes on bad LLM output and never silently passes corrupted data downstream.

Additionally, all user-uploaded document text is sanitized against prompt injection patterns before being sent to the LLM, and corpus IDs are validated against path traversal attacks.

## 🔌 MCP Integration

Sentinel exposes its core logic as an **MCP (Model Context Protocol) server**, allowing any MCP-compatible AI host (Claude Desktop, Cursor, custom agent frameworks) to call Sentinel as a tool.

### Available Tools

| Tool | Input | Output |
|------|-------|--------|
| `check_contradiction` | `claim_a: str, claim_b: str` | `ContradictionResult` JSON (contradiction, confidence, analysis, evidence spans) |
| `audit_corpus` | `corpus_id: str` | Full audit report JSON (list of `ContradictionReport` items) |

### Running the MCP Server

```bash
cd backend
python -m app.mcp_server
```

The server runs on stdio transport. Connect any MCP-compatible host to interact with it.

## 📊 Evaluation

The project includes an evaluation harness (`backend/eval/run_eval.py`) with 23 hand-labeled claim pairs (a mix of true contradictions, genuine scope-exceptions, and ambiguous edge cases). The evaluation dataset was deliberately expanded to remove any tuning bias and prove the model generalizes strict logical distinctions.

Run it to get precision, recall, and F1 scores:

```bash
cd backend
python -m eval.run_eval
```

**Latest Benchmark (Groq/Llama-3):**

- **Precision:** 0.3500 (TP=7, FP=13)
- **Recall:** 0.7778 (TP=7, FN=2)
- **F1 Score:** 0.4828
- **Accuracy:** 0.3478 (8/23 correct)

*(Note: The latest run encountered 15 HTTP 429 Rate Limit Errors from the Groq API due to token exhaustion, severely impacting the final recorded accuracy.)*

## 🔮 Future Improvements

- Add support for DOCX and image-based PDFs (OCR).
- Implement persistent user authentication (OAuth2 / JWT).
- Export contradiction reports to CSV/Excel.
- Add multi-tenant support for multiple organizations.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
