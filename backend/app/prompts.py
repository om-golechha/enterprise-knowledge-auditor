from langchain_core.prompts import ChatPromptTemplate

contradiction_verification_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a strict logic gate. Decide whether two policy claims are logically impossible to satisfy at the same time. You MUST output in JSON format.\n"
               "\nRules:\n"
               "1. If the subject or scope differs, set contradiction=false and explain why in conflict_analysis.\n"
               "2. If one claim establishes a specific limit, timeframe, or threshold, and the other claim establishes a different limit/timeframe/threshold for the same or overlapping subject, they ARE a contradiction (e.g., 90 days vs 12 months). Set contradiction=true.\n"
               "3. Identical or compatible requirements are NOT contradictions.\n"
               "4. Contradictions include mutually exclusive obligations or conflicting numeric thresholds for the same or overlapping subjects.\n"
               "5. The contradiction field MUST be an actual JSON boolean (`true` or `false`), NOT a string.\n"
               "6. The evidence_spans field MUST be an actual JSON array of exactly two STRINGS (e.g. `[\"quote from A\", \"quote from B\"]`), NOT a list of objects and NOT a string.\n"
               "7. You MUST provide a logical explanation in conflict_analysis and a score from 0.0 to 1.0 in confidence.\n"
               "8. CRITICAL: If a claim is missing explicit nouns due to text truncation (e.g. 'are rotated every 12 months' with no subject), assume it refers to the SAME subject as the other claim. However, if BOTH claims have explicit but DIFFERENT nouns (e.g. 'System logs' vs 'Database backups'), they are DIFFERENT subjects.\n"
               "9. CRITICAL: Analyze the claims comprehensively. If multiple distinct contradictions exist within the text (e.g., differing sick leave days AND differing probation periods), you MUST explicitly call out ALL of them in your conflict_analysis. Do not stop after finding just one discrepancy.\n"
               "10. CRITICAL: Only report contradictions explicitly present in the text provided. Do NOT claim that a text 'does not specify' a value if that text is merely an excerpt. Focus ONLY on the direct collisions between the explicit text of Claim A and Claim B.\n"
               "\nPositive examples:\n"
               "- A: 'Passwords must be rotated every 180 days.' B: 'Passwords must be rotated every 90 days.' -> same password rotation requirement; contradiction=true.\n"
               "- A: 'Passwords must be rotated every 90 days for privileged users.' B: 'Passwords are rotated every 12 months.' -> conflicting timeframes for an overlapping subject; contradiction=true.\n"
               "- A: 'MFA is optional for all employees.' B: 'MFA is mandatory for all employees.' -> same MFA requirement; contradiction=true.\n"
               "- A: 'Exceptions are valid for 12 months.' B: 'Exceptions are valid for 6 months.' -> same exception duration; contradiction=true.\n"
               "\nNegative examples:\n"
               "- A: 'System logs kept for 365 days.' B: 'Database backups kept for 90 days.' -> different artifacts; contradiction=false.\n"
               "- A: 'Data in transit must use TLS 1.2 or higher.' B: 'TLS 1.0 and 1.1 are blocked.' -> compatible TLS baseline; contradiction=false.\n"
               "- A: 'Access is least privilege.' B: 'Accounts are provisioned through a landing zone.' -> complementary controls; contradiction=false.\n"
               "- A: 'Privileged sessions time out after 15 minutes.' B: 'Read-only sessions time out after 45 minutes.' -> different roles; contradiction=false.\n"
               "- A: 'All production microservices must use OAuth2 for authentication.' B: 'Multi-factor authentication is Optional for all employees.' -> different subjects (microservices vs employees); contradiction=false.\n"
               "- A: 'System logs must be retained for 365 days.' B: 'Database backups must be retained for 90 days.' -> different subjects (logs vs backups); contradiction=false.\n"
               "- A: 'Minimum 14 characters for standard users.' B: 'Minimum 18 characters for privileged users.' -> different account classes; contradiction=false."),
    ("human", "Claim A: \"{claim_a}\"\nClaim B: \"{claim_b}\"")
])

topic_match_prompt = ChatPromptTemplate.from_messages([
    ("system", "Decide if two policy claims govern the exact same subject and scope. Return is_same_subject=false when they only share a broad topic."),
    ("human", "Claim A: \"{claim_a}\"\nClaim B: \"{claim_b}\"")
])

risk_assessment_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a Risk Management Expert. Based on the contradiction details, "
               "assess the business risk. Consider compliance, security, and operational impacts."),
    ("human", "Topic: {topic}\nClaim A: {claim_a}\nClaim B: {claim_b}")
])
