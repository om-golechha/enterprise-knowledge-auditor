import os
import re
import shutil
import uuid
import logging
import threading
from typing import List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import APIKeyHeader
from fastapi.concurrency import run_in_threadpool
import json

from app.models import AuditReport, ReportStatus, ReportStatusUpdate
from app.services import DocumentIngestor, Chunker, VectorStore
from app.security import sanitize_text
from app.config import config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
REPORTS_FILE = os.path.join(os.path.dirname(__file__), "audit_reports.json")

app = FastAPI(
    title="Enterprise Knowledge Auditor",
    description="Proactive document contradiction scanner.",
    version="2.1.0",
)

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def get_api_key(api_key: str = Security(api_key_header)):
    if not config.API_KEY or api_key == config.API_KEY:
        return api_key
    raise HTTPException(status_code=403, detail="Could not validate credentials")

# -- CORS: configurable origins, never wildcard + credentials ---------------
_origins = [o.strip() for o in config.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)


# -- Global exception handler to prevent stack-trace leaks ------------------
@app.exception_handler(Exception)
async def _global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again."},
    )


# ---------------------------------------------------------------------------
# Shared state (in-memory for demo — would be a DB in production)
# ---------------------------------------------------------------------------
audit_reports: dict[str, AuditReport] = {}

# Load persisted reports if they exist
if os.path.exists(REPORTS_FILE):
    try:
        with open(REPORTS_FILE, "r") as f:
            data = json.load(f)
            for k, v in data.items():
                audit_reports[k] = AuditReport(**v)
    except Exception as e:
        logger.error(f"Failed to load reports: {e}")

vector_stores: dict[str, VectorStore] = {}
_lock = threading.Lock()

CORPUS_ID_RE = re.compile(r"^[a-zA-Z0-9_\-]{1,128}$")
ALLOWED_EXTENSIONS = {".pdf"}


def _validate_corpus_id(corpus_id: str) -> str:
    """Validate corpus_id to prevent injection / path traversal."""
    if not CORPUS_ID_RE.match(corpus_id):
        raise HTTPException(
            status_code=400,
            detail="corpus_id must be 1-128 alphanumeric/underscore/hyphen characters.",
        )
    return corpus_id


def get_vector_store(corpus_id: str) -> VectorStore:
    with _lock:
        if corpus_id not in vector_stores:
            vector_stores[corpus_id] = VectorStore(corpus_id)
        return vector_stores[corpus_id]

def _persist_reports():
    with open(REPORTS_FILE, "w") as f:
        json.dump({k: v.model_dump(mode="json") for k, v in audit_reports.items()}, f)

def _enforce_report_limit() -> None:
    """Evict the oldest report when over the limit."""
    if len(audit_reports) <= config.MAX_REPORTS:
        return
    oldest_key = next(iter(audit_reports))
    del audit_reports[oldest_key]
    _persist_reports()

    corpus_dir = os.path.join(UPLOADS_DIR, oldest_key)
    if os.path.isdir(corpus_dir):
        try:
            shutil.rmtree(corpus_dir)
            logger.info("Evicted report and files for corpus %s", oldest_key)
        except OSError as e:
            logger.warning("Failed to clean files for %s: %s", oldest_key, e)


def _safe_path(corpus_id: str, filename: str) -> str:
    """Resolve a file path inside the uploads dir, blocking path traversal."""
    corpus_dir = os.path.realpath(os.path.join(UPLOADS_DIR, corpus_id))
    os.makedirs(corpus_dir, exist_ok=True)
    full_path = os.path.realpath(os.path.join(corpus_dir, filename))

    # Ensure the resolved path is strictly inside the specific corpus directory
    if not full_path.startswith(corpus_dir + os.sep):
        raise HTTPException(status_code=400, detail="Invalid file path.")
    return full_path


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/documents/{corpus_id}/{filename}")
async def get_document(corpus_id: str, filename: str, api_key: str = Depends(get_api_key)):
    """Serve an uploaded PDF for the frontend evidence viewer."""
    _validate_corpus_id(corpus_id)
    file_path = _safe_path(corpus_id, filename)

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Document not found.")
    return FileResponse(file_path, media_type="application/pdf")


@app.post("/ingest")
async def ingest_documents(
    corpus_id: str = Form(...),
    files: List[UploadFile] = File(...),
    api_key: str = Depends(get_api_key)
):
    """Upload documents, extract claims via LLM, embed, store in Chroma."""
    _validate_corpus_id(corpus_id)

    # --- File count limit ---
    if len(files) > config.MAX_FILES_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {config.MAX_FILES_PER_REQUEST} files per request.",
        )

    store = get_vector_store(corpus_id)
    chunker = Chunker()
    ingested_chunks = 0
    filenames: list[str] = []

    corpus_dir = os.path.join(UPLOADS_DIR, corpus_id)
    os.makedirs(corpus_dir, exist_ok=True)
    manifest_path = os.path.join(corpus_dir, "manifest.json")
    manifest = {
        "expected": len(files),
        "files": {}
    }

    max_bytes = config.MAX_FILE_SIZE_MB * 1024 * 1024

    for file in files:
        filename = file.filename or "unknown.pdf"
        try:

            # --- Extension validation ---
            ext = os.path.splitext(filename)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type '{ext}'. Only PDF files are accepted.",
                )

            filenames.append(filename)

            # Save file securely in chunks to prevent OOM DoS attacks
            file_path = _safe_path(corpus_id, filename)
            size = 0
            with open(file_path, "wb") as f:
                while chunk := await file.read(1024 * 1024):
                    size += len(chunk)
                    if size > max_bytes:
                        raise HTTPException(
                            status_code=400,
                            detail=f"File '{filename}' exceeds {config.MAX_FILE_SIZE_MB}MB limit."
                        )
                    f.write(chunk)

            docs = await run_in_threadpool(DocumentIngestor.load_pdf, file_path, f"{corpus_id}/{filename}")

            # Sanitize extracted text against prompt injection
            for doc in docs:
                doc.page_content = sanitize_text(doc.page_content)

            claim_docs = await run_in_threadpool(chunker.process_and_extract_claims, docs)
            await run_in_threadpool(store.add_documents, claim_docs)
            ingested_chunks += len(claim_docs)
            
            manifest["files"][filename] = {
                "parsed": True,
                "claims": len(claim_docs),
                "error": None
            }
        except Exception as e:
            manifest["files"][filename] = {
                "parsed": False,
                "claims": 0,
                "error": str(e)
            }
            with open(manifest_path, "w") as f:
                json.dump(manifest, f)
            import traceback; traceback.print_exc(); logger.error(f"Pipeline failed for {filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Pipeline aborted: File '{filename}' failed to process. Reason: {e}")

    with open(manifest_path, "w") as f:
        json.dump(manifest, f)

    return {
        "status": "success",
        "corpus_id": corpus_id,
        "claims_ingested": ingested_chunks,
        "filenames": filenames,
    }


@app.post("/audit", response_model=AuditReport)
async def run_audit(corpus_id: str, api_key: str = Depends(get_api_key)):
    """Run the full contradiction-detection pipeline via LangGraph."""
    _validate_corpus_id(corpus_id)
    store = get_vector_store(corpus_id)

    if store.count() == 0:
        raise HTTPException(status_code=400, detail="Corpus is empty. Ingest documents first.")

    from app.graph import build_audit_graph

    graph = build_audit_graph()

    initial_state = {
        "corpus_id": corpus_id,
        "vector_store": store,          # Pass the populated store through state
        "candidates": [],
        "reports": [],
        "discarded": 0,
    }

    final_state = await run_in_threadpool(graph.invoke, initial_state)

    verified = final_state["reports"]
    discarded = final_state["discarded"]
    candidates = final_state["candidates"]

    # Health score: penalise 5 points per contradiction, floor at 0
    total_chunks = store.count()
    health_score = max(0.0, 100.0 - (len(verified) * 5.0))

    # Count unique source documents (fallback if manifest is missing)
    all_docs = store.get_all_documents()
    unique_doc_ids = {
        doc.metadata.get("document_id", "")
        for doc in all_docs
        if doc.metadata.get("document_id")
    }

    manifest_path = os.path.join(UPLOADS_DIR, corpus_id, "manifest.json")
    expected_docs = 0
    if os.path.exists(manifest_path):
        with open(manifest_path, "r") as f:
            manifest = json.load(f)
            expected_docs = manifest.get("expected", 0)

    total_docs = expected_docs if expected_docs > 0 else len(unique_doc_ids)

    audit_id = str(uuid.uuid4())
    report = AuditReport(
        audit_id=audit_id,
        corpus_id=corpus_id,
        total_documents=total_docs,
        total_claims_extracted=total_chunks,
        candidates_checked=len(candidates),
        contradictions_found=len(verified),
        discarded_unverified=discarded,
        health_score=health_score,
        contradictions=verified,
    )

    with _lock:
        audit_reports[audit_id] = report
        _enforce_report_limit()
        _persist_reports()

    return report


@app.get("/report/{audit_id}", response_model=AuditReport)
async def get_report(audit_id: str, api_key: str = Depends(get_api_key)):
    with _lock:
        report = audit_reports.get(audit_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report


@app.patch("/report/{audit_id}/contradiction/{index}/status")
async def update_status(audit_id: str, index: int, update: ReportStatusUpdate, api_key: str = Depends(get_api_key)):
    with _lock:
        report = audit_reports.get(audit_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    if index < 0 or index >= len(report.contradictions):
        raise HTTPException(status_code=404, detail="Contradiction index out of range.")

    report.contradictions[index].status = update.status
    _persist_reports()
    return {"status": "success", "new_status": update.status}


@app.get("/health-score/{corpus_id}")
async def get_health_score(corpus_id: str, api_key: str = Depends(get_api_key)):
    _validate_corpus_id(corpus_id)
    store = get_vector_store(corpus_id)
    return {"corpus_id": corpus_id, "total_chunks": store.count(), "status": "active"}


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
