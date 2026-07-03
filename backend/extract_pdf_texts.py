import fitz # PyMuPDF
import os

pdf_files = ['architecture_guidelines.pdf', 'security_policy.pdf', 'test_doc_A.pdf', 'test_doc_B.pdf', 'zs.pdf']

for pdf_file in pdf_files:
    print(f"--- {pdf_file} ---")
    try:
        doc = fitz.open(f"/Users/omgolechha/Downloads/assistants/backend/data/{pdf_file}")
        for page in doc:
            print(page.get_text())
    except Exception as e:
        print(f"Error: {e}")
