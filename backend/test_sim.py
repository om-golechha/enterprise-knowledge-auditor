from langchain_huggingface import HuggingFaceEmbeddings
import numpy as np

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
v1 = embeddings.embed_query("Employees may work remotely for up to three days per week.")
v2 = embeddings.embed_query("Employees are permitted to work remotely for a maximum of two days per week.")

score = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
print("Cosine similarity:", score)

v1 = embeddings.embed_query("Operational system logs generated from application servers, monitoring platforms, infrastructure services, and endpoint devices shall be retained for a minimum of THIRTY (30) DAYS to optimize storage utilization and operational performance.")
v2 = embeddings.embed_query("Security logs generated from authentication systems, VPN gateways, firewalls, endpoint protection platforms, and cloud infrastructure must be retained for a minimum of THREE HUNDRED SIXTY-FIVE (365) DAYS for auditing, forensic investigation, and regulatory compliance.")

score = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
print("Log retention similarity:", score)
