import os
import sys
import uuid
import logging
from dotenv import load_dotenv

# Ensure backend directory is in Python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)

# Load environment variables (GROQ_API_KEY etc)
load_dotenv(os.path.join(backend_dir, '..', '.env'))

# Configure logging to see the newly added instrumentation
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Attempt to import or install fpdf to generate test PDFs
try:
    from fpdf import FPDF
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fpdf"])
    from fpdf import FPDF

from app.services import DocumentIngestor, Chunker, VectorStore, ContradictionDetector, EvidenceVerifier

def generate_test_pdfs():
    data_dir = os.path.join(backend_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    
    doc_a_path = os.path.join(data_dir, "test_doc_A.pdf")
    doc_b_path = os.path.join(data_dir, "test_doc_B.pdf")
    
    # Doc A content
    pdf_a = FPDF()
    pdf_a.set_font("Arial", size=12)
    pdf_a.add_page()
    pdf_a.multi_cell(0, 10, "Corporate Policy A\n\n1. Password Rotation: Passwords must be rotated every 180 days.")
    pdf_a.add_page()
    pdf_a.multi_cell(0, 10, "Corporate Policy A\n\n2. MFA: Multi-factor authentication is Optional for all employees.")
    pdf_a.add_page()
    pdf_a.multi_cell(0, 10, "Corporate Policy A\n\n3. Remote Work: Employees are allowed to work remotely 3 days a week.")
    pdf_a.add_page()
    pdf_a.multi_cell(0, 10, "Corporate Policy A\n\n4. Log Retention: System logs must be retained for 365 days.")
    pdf_a.output(doc_a_path)
    
    # Doc B content
    pdf_b = FPDF()
    pdf_b.set_font("Arial", size=12)
    pdf_b.add_page()
    pdf_b.multi_cell(0, 10, "Corporate Policy B\n\n1. Password Rotation: Passwords must be rotated every 90 days.")
    pdf_b.add_page()
    pdf_b.multi_cell(0, 10, "Corporate Policy B\n\n2. MFA: Multi-factor authentication is Mandatory for all employees.")
    pdf_b.add_page()
    pdf_b.multi_cell(0, 10, "Corporate Policy B\n\n3. Remote Work: Employees are allowed to work remotely 2 days a week.")
    pdf_b.add_page()
    pdf_b.multi_cell(0, 10, "Corporate Policy B\n\n4. Log Retention: System logs must be retained for 30 days.")
    pdf_b.output(doc_b_path)
    
    return doc_a_path, doc_b_path

def run_test():
    doc_a_path, doc_b_path = generate_test_pdfs()
    print(f"Generated test corpus: {doc_a_path}, {doc_b_path}")
    
    corpus_id = f"test_corpus_{uuid.uuid4().hex[:8]}"
    print(f"Running pipeline on {corpus_id}")
    
    # 1. Ingest
    docs_a = DocumentIngestor.load_pdf(doc_a_path, "doc_A")
    docs_b = DocumentIngestor.load_pdf(doc_b_path, "doc_B")
    all_docs = docs_a + docs_b
    
    # 2. Chunk & Extract
    chunker = Chunker()
    claim_docs = chunker.process_and_extract_claims(all_docs)
    
    # 3. VectorStore
    vs = VectorStore(corpus_id)
    vs.add_documents(claim_docs)
    
    # 4. Generate Candidates
    detector = ContradictionDetector(vs)
    candidates = detector.generate_candidates()
    
    # 5. Verify via LLM
    verified_contradictions = []
    for cand in candidates:
        is_success, resp, is_rejected_by_span = EvidenceVerifier.verify(cand)
        if is_success and resp.is_contradiction:
            verified_contradictions.append({
                "claim_a": cand.claim_a,
                "claim_b": cand.claim_b,
                "title": resp.title
            })
            
    # --- Assertions ---
    found_text = str(verified_contradictions).lower()
    
    expected_matches = [
        ("180", "90"),
        ("optional", "mandatory"),
        ("3 days", "2 days"),
        ("365", "30")
    ]
    
    missing = []
    for pair in expected_matches:
        if pair[0] not in found_text or pair[1] not in found_text:
            missing.append(pair)
            
    print("\n\n" + "="*50)
    print("REGRESSION TEST RESULTS")
    print("="*50)
    print(f"Total verified contradictions found: {len(verified_contradictions)}")
    for v in verified_contradictions:
        print(f" - {v['title']}: {v['claim_a']} VS {v['claim_b']}")
        
    if len(verified_contradictions) < 4:
        missing.append("Expected at least 4 individual contradictions but found fewer.")
        
    if missing:
        print("\n❌ FAILED! Missing expected contradictions:")
        for m in missing:
            print(f" - Expected pair containing: {m}")
        sys.exit(1)
    else:
        print("\n✅ SUCCESS! All 4 known contradictions were detected.")
        sys.exit(0)

if __name__ == "__main__":
    run_test()
