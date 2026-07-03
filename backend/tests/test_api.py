"""Tests for the FastAPI endpoints.

These tests verify the actual routes defined in main.py:
  - POST /ingest
  - POST /audit
  - GET  /report/{audit_id}
  - PATCH /report/{audit_id}/contradiction/{index}/status
  - GET  /health-score/{corpus_id}
  - GET  /documents/{corpus_id}/{filename}
"""
import io
import pytest
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


# --------------------------------------------------------------------------
# Health-Score endpoint
# --------------------------------------------------------------------------

def test_health_score_returns_200():
    resp = client.get("/health-score/test_corpus")
    assert resp.status_code == 200
    data = resp.json()
    assert "corpus_id" in data
    assert "total_chunks" in data
    assert data["status"] == "active"


def test_health_score_rejects_invalid_corpus_id():
    resp = client.get("/health-score/../etc/passwd")
    assert resp.status_code in (400, 404)


# --------------------------------------------------------------------------
# Ingest endpoint
# --------------------------------------------------------------------------

def test_ingest_rejects_non_pdf():
    """Only .pdf files should be accepted."""
    fake_txt = io.BytesIO(b"not a pdf")
    resp = client.post(
        "/ingest",
        data={"corpus_id": "test_corpus"},
        files=[("files", ("notes.txt", fake_txt, "text/plain"))],
    )
    assert resp.status_code == 400
    assert "Unsupported file type" in resp.json()["detail"]


def test_ingest_rejects_invalid_corpus_id():
    fake_pdf = io.BytesIO(b"%PDF-1.4 fake")
    resp = client.post(
        "/ingest",
        data={"corpus_id": "../../etc"},
        files=[("files", ("test.pdf", fake_pdf, "application/pdf"))],
    )
    assert resp.status_code == 400


# --------------------------------------------------------------------------
# Report endpoint
# --------------------------------------------------------------------------

def test_get_missing_report_returns_404():
    resp = client.get("/report/nonexistent-id")
    assert resp.status_code == 404


# --------------------------------------------------------------------------
# Document endpoint (path traversal protection)
# --------------------------------------------------------------------------

def test_document_rejects_path_traversal():
    resp = client.get("/documents/../../.env/anything")
    assert resp.status_code in (400, 404)


def test_document_returns_404_for_missing_file():
    resp = client.get("/documents/test_corpus/nonexistent.pdf")
    assert resp.status_code == 404
