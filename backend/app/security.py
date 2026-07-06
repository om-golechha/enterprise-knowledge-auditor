import re
import logging
from typing import Optional, Type, TypeVar
from pydantic import BaseModel, ValidationError

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


# ---------------------------------------------------------------------------
# SecurityValidator — Named, testable guardrail for LLM output validation.
#
# WHY: Pydantic already validates LLM outputs, but silently. This class
# makes validation VISIBLE: it logs explicit "REJECTED" messages when the
# LLM returns malformed data, detects prompt-injection attempts embedded
# in output fields, and returns a safe fallback instead of crashing or
# silently passing bad data downstream.
# ---------------------------------------------------------------------------

T = TypeVar("T", bound=BaseModel)


class SecurityValidator:
    """Validates and sanitizes LLM structured outputs before downstream use.

    This is the central guardrail that sits between raw LLM JSON and the
    rest of the pipeline. It enforces three checks:

    1. Schema conformance — Pydantic model validation catches wrong types,
       missing fields, extra fields, and out-of-range values.
    2. Injection detection — String fields are scanned for known prompt
       injection patterns that could propagate into future LLM calls.
    3. Safe fallback — On any failure, a clearly-marked safe default is
       returned so the pipeline continues without crashing or silently
       accepting corrupted data.
    """

    @staticmethod
    def validate_llm_output(
        raw_data: dict,
        model_class: Type[T],
        fallback: T,
    ) -> tuple[T, bool]:
        """Validate raw LLM output dict against a Pydantic model.

        Args:
            raw_data: The raw dict parsed from LLM JSON output.
            model_class: The Pydantic model class to validate against.
            fallback: A safe default instance to return on validation failure.

        Returns:
            A tuple of (validated_model, is_valid). If is_valid is False,
            the returned model is the fallback — never the bad data.
        """
        # --- Step 1: Pydantic schema validation ---
        try:
            validated = model_class.model_validate(raw_data)
        except ValidationError as exc:
            logger.warning(
                "REJECTED: malformed/potentially injected LLM output. "
                "Validation errors: %s | Raw data keys: %s",
                exc.error_count(),
                list(raw_data.keys()) if isinstance(raw_data, dict) else type(raw_data).__name__,
            )
            return fallback, False

        # --- Step 2: Scan string fields for prompt injection ---
        for field_name, field_value in validated.model_dump().items():
            texts_to_check = []
            if isinstance(field_value, str):
                texts_to_check.append(field_value)
            elif isinstance(field_value, list):
                texts_to_check.extend(str(item) for item in field_value)

            for text in texts_to_check:
                if contains_injection(text):
                    logger.warning(
                        "REJECTED: prompt injection detected in field '%s'. "
                        "Content: '%.100s...'",
                        field_name,
                        text,
                    )
                    return fallback, False

        return validated, True

