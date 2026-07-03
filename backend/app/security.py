import re
import logging

logger = logging.getLogger(__name__)

INJECTION_PATTERNS = [
    r"(?i)\bignore\s+(all\s+)?(previous\s+)?instructions\b",
    r"(?i)\byou\s+are\s+now\b",
    r"(?i)\bsystem\s*:",
    r"(?i)\bforget\s+(all\s+)?(previous\s+)?instructions\b",
    r"(?i)\bdisregard\s+(all\s+)?(previous\s+)?instructions\b",
]

def sanitize_text(text: str) -> str:
    """
    Strips out instruction-like patterns from text to prevent prompt injection.
    Logs if any patterns are found.
    """
    sanitized = text
    flagged = False
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, sanitized):
            flagged = True
            logger.warning(f"Prompt injection pattern detected and stripped: {pattern}")
            sanitized = re.sub(pattern, "[REDACTED]", sanitized)
            
    if flagged:
        logger.warning(f"Original text flagged for injection: {text}")
        
    return sanitized

def contains_injection(text: str) -> bool:
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text):
            return True
    return False
