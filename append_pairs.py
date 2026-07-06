import json

file_path = "backend/eval/labeled_pairs.json"
with open(file_path, "r") as f:
    data = json.load(f)

new_pairs = [
    {
        "id": "vendor_sla_conflict",
        "claim_a": "All vendor contracts must include a 99.99% uptime SLA.",
        "claim_b": "Vendor contracts are required to guarantee at least 99.9% uptime.",
        "label": True,
        "rationale": "Conflicting strict requirements for the same subject (vendor SLA uptime)."
    },
    {
        "id": "data_retention_conflict",
        "claim_a": "Financial records must be permanently deleted after 7 years.",
        "claim_b": "Financial records must be retained indefinitely for audit purposes.",
        "label": True,
        "rationale": "Same subject (financial records), mutually exclusive retention policies (deleted after 7 years vs retained indefinitely)."
    },
    {
        "id": "training_scope_exception",
        "claim_a": "All personnel must complete annual security awareness training.",
        "claim_b": "Temporary contractors with less than 30-day contracts are exempt from annual security training.",
        "label": False,
        "rationale": "Scope-exception: Contractors with <30 day contracts are a specific carve-out to the general personnel rule."
    },
    {
        "id": "expense_limit_scope_exception",
        "claim_a": "The maximum allowable expense for a client dinner is $100 per head.",
        "claim_b": "Executive leadership may approve client dinners up to $250 per head.",
        "label": False,
        "rationale": "Scope-exception: Executive leadership has a specific override/carve-out for the general expense limit."
    },
    {
        "id": "patching_stricter_subset",
        "claim_a": "All software vulnerabilities must be patched within 30 days of discovery.",
        "claim_b": "Critical severity vulnerabilities must be patched within 7 days of discovery.",
        "label": False,
        "rationale": "Ambiguous edge case: One is a stricter subset of the other. Following the 7-day rule for criticals does not make it impossible to follow the 30-day rule for all vulnerabilities. They can coexist."
    }
]

data.extend(new_pairs)

with open(file_path, "w") as f:
    json.dump(data, f, indent=2)
