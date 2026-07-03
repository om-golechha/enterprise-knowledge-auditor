from langchain_core.prompts import ChatPromptTemplate

topic_match_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a strict logic gate. Your ONLY job is to determine if two policy claims govern the EXACT SAME subject matter, context, and scope.\n"
               "RULES:\n"
               "- 'Remote workers use VPN' and 'Office workers use LAN' -> DIFFERENT SUBJECT (Remote vs Office). Return is_same_subject=False.\n"
               "- 'Emergency changes do not require CAB approval' vs 'Standard changes require CAB approval' -> DIFFERENT SUBJECT (Emergency vs Standard). Return False.\n"
               "- 'Passwords must be 12 characters' vs 'Passwords must be 8 characters' -> EXACT SAME SUBJECT (Password length). Return True.\n"
               "Output your reasoning, then the boolean."),
    ("human", "Claim A: \"{claim_a}\"\nClaim B: \"{claim_b}\"")
])

contradiction_verification_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a Principal Security Auditor. Do these two claims contradict each other?\n"
               "CRITICAL INSTRUCTIONS:\n"
               "1. You must first summarize the premise of Claim A and Claim B objectively.\n"
               "2. Two claims ONLY contradict if they are mutually exclusive. It must be IMPOSSIBLE to comply with both simultaneously.\n"
               "3. You must provide exact evidence spans from the original text showing the contradiction.\n"
               "4. If they do not contradict, or if they apply to different scopes/contexts, you MUST output contradiction=False.\n"
               "5. Confidence must reflect the logical clarity of the conflict (0.0 to 1.0)."),
    ("human", "Claim A: \"{claim_a}\"\nClaim B: \"{claim_b}\"")
])

risk_assessment_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a Risk Management Expert. Based on the contradiction details, "
               "assess the business risk. Consider compliance, security, and operational impacts."),
    ("human", "Topic: {topic}\nClaim A: {claim_a}\nClaim B: {claim_b}")
])
