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
pip install -r requirements.txt
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
uvicorn main:app --reload --port 8000
```

### 2. Start the Frontend Development Server

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser.

## 🧠 AI Pipeline

The AI pipeline utilizes **LangGraph** to process documents iteratively:

1. **Extract**: Text and metadata are pulled from PDFs.
2. **Embed**: Text chunks are embedded using `all-MiniLM-L6-v2` and stored in ChromaDB.
3. **Retrieve**: Semantic search pulls potentially conflicting chunks.
4. **Analyze**: An LLM (powered by Groq) evaluates the retrieved chunks for logical contradictions.
5. **Report**: Discrepancies are categorized by severity and formatted into structured JSON for the frontend.

## 🔮 Future Improvements

- Add support for DOCX and image-based PDFs (OCR).
- Implement persistent user authentication (OAuth2 / JWT).
- Export contradiction reports to CSV/Excel.
- Add multi-tenant support for multiple organizations.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
