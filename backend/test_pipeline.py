import requests

url = "http://localhost:8000/api/v1/analyze"
files = [("files", ("test.pdf", open("test.pdf", "rb"), "application/pdf"))]
data = {"corpus_id": "test_corpus"}
print("Sending request...")
response = requests.post(url, files=files, data=data)
print("Status:", response.status_code)
try:
    print(response.json())
except:
    print(response.text)
