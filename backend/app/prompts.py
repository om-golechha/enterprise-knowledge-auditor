from langchain_core.prompts import ChatPromptTemplate

claim_extraction_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert at information extraction. Extract distinct, factual, and verifiable claims from the following text. "
               "CRITICAL INSTRUCTION: You must classify EVERY extracted claim into a category.\n"
               "BUSINESS_POLICY: Real enterprise rules, procedures, security, compliance, auth, etc.\n"
               "METADATA: Document versions, review dates, effective dates, document IDs, author names, copyright notices, watermarks.\n"
               "LEGAL_DISCLAIMER / HEADER / FOOTER / NOISE: Page numbers, boilerplate footers, generated timestamps.\n"
               "Your goal is to separate pure business knowledge from document lifecycle metadata. "
               "Each claim must be a complete sentence that can stand alone without context."),
    ("human", "TEXT:\n{chunk_text}")
])

contradiction_verification_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert auditor. Do these two claims contradict each other? "
               "CRITICAL INSTRUCTION: Two claims are contradictory if they provide conflicting rules, requirements, facts, or policies. "
               "If they discuss completely unrelated systems or contexts, they do not contradict, but if they discuss the same or overlapping business policies with different requirements, they DO contradict. "
               "You must provide exact evidence spans from the original text if they do. "
               "Provide a concise, 1-2 sentence explanation of the contradiction without generic AI phrases. "
               "If they do not contradict, or if you are uncertain, you must output contradiction=False."),
    ("human", "Claim A: \"{claim_a}\"\nClaim B: \"{claim_b}\"")
])

risk_assessment_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a risk management expert. Based on the contradiction details, "
               "assess the business risk. Consider compliance, security, and operational impacts."),
    ("human", "Topic: {topic}\nClaim A: {claim_a}\nClaim B: {claim_b}")
])
