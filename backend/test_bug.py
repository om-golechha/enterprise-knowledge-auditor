import requests
import uuid

corpus_id = "test-corpus-" + str(uuid.uuid4())[:8]

files = [
    ("files", open("uploads/713030c1-4794-4b56-8ba9-a1ef0d5fb8de/pdf1.pdf", "rb")),
    ("files", open("uploads/713030c1-4794-4b56-8ba9-a1ef0d5fb8de/pdf2.pdf", "rb")),
    ("files", open("uploads/713030c1-4794-4b56-8ba9-a1ef0d5fb8de/pdf3.pdf", "rb")),
]
data = {"corpus_id": corpus_id}

print("Ingesting...")
try:
    resp = requests.post("http://localhost:8000/ingest", data=data, files=files)
    print(resp.json())

    print("Auditing...")
    resp = requests.post(f"http://localhost:8000/audit?corpus_id={corpus_id}")
    if resp.status_code == 200:
        print(resp.json())
    else:
        print(resp.status_code, resp.text)
except Exception as e:
    print(e)
