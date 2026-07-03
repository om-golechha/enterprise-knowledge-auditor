import fitz

files = ['architecture_guidelines.pdf', 'security_policy.pdf', 'test_doc_A.pdf', 'test_doc_B.pdf']
for f in files:
    print(f"\n--- {f} ---")
    doc = fitz.open(f"/Users/omgolechha/Downloads/assistants/backend/data/{f}")
    for i in range(len(doc)):
        print(doc[i].get_text()[:500])
