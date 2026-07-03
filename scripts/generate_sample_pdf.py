from fpdf import FPDF
import os

def create_pdf(filename, text, page_num):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.multi_cell(0, 10, txt=text)
    
    os.makedirs("data", exist_ok=True)
    pdf.output(f"data/{filename}")
    print(f"Created data/{filename}")

if __name__ == "__main__":
    doc1 = """CORPORATE SECURITY POLICY v2.1
    
1. Authentication
All production microservices must use OAuth2 for authentication. Under no circumstances should basic auth be used in production environments.

2. Data Storage
All PII must be encrypted at rest using AES-256. Database backups must be retained for 90 days.
"""

    doc2 = """ENGINEERING ARCHITECTURE GUIDELINES

Service: User Profile Service
Deployment: AWS EKS

The user profile service uses basic auth for internal service-to-service communication to reduce latency. This is acceptable for services within the same VPC.

Data is stored in PostgreSQL. Passwords are hashed using bcrypt.
"""

    create_pdf("security_policy.pdf", doc1, 1)
    create_pdf("architecture_guidelines.pdf", doc2, 1)
