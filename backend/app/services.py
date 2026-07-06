import os
import uuid
import datetime
import logging
import re
import threading
from typing import List, Tuple, Dict, Set
from tenacity import retry, stop_after_attempt, wait_exponential

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.models import ContradictionCandidate, VerificationResponse, RiskLevel, ContradictionResult
from app.config import config
from app.llm import get_llm
from app.prompts import contradiction_verification_prompt

logger = logging.getLogger(__name__)

_embeddings_lock = threading.Lock()
_embeddings = None


def get_embeddings():
    """Create the embedding model once, and only when embeddings are needed."""
    global _embeddings
    if _embeddings is not None:
        return _embeddings

    with _embeddings_lock:
        if _embeddings is None:
            os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
            try:
                _embeddings = HuggingFaceEmbeddings(
                    model_name=config.EMBEDDING_MODEL,
                    model_kwargs={"device": "cpu"},
                    encode_kwargs={
                        "batch_size": config.EMBEDDING_BATCH_SIZE,
                        "normalize_embeddings": True,
                    },
                )
            except Exception as exc:
                raise RuntimeError(
                    "Embedding model could not be loaded. Ensure the model is cached "
                    "locally or allow the server to download it once during setup."
                ) from exc
    return _embeddings


class DocumentIngestor:
    @staticmethod
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def load_pdf(file_path: str, doc_id: str) -> List[Document]:
        """Extracts text and metadata from a PDF using LangChain."""
        logger.info(f"STAGE 1: Raw extracted text from PDF: {file_path}")
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        
        timestamp = datetime.datetime.now().isoformat()
        filename = os.path.basename(file_path)
        
        for i, doc in enumerate(docs):
            logger.debug(f"Raw extracted text (Page {i+1}): {doc.page_content[:200]}...")
            # PyPDFLoader already includes "page" in metadata
            doc.metadata["document_id"] = doc_id
            doc.metadata["filename"] = filename
            doc.metadata["upload_timestamp"] = timestamp
        return docs

class Chunker:
    def __init__(self):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " "]
        )

    # Keyword-based topic heuristic — zero API calls, runs in-process
    _TOPIC_KEYWORDS: Dict[str, List[str]] = {
        "Access Control": ["password", "mfa", "authentication", "login", "credential", "privileged", "access", "account", "session", "sso", "ldap", "okta"],
        "Data Security": ["encryption", "aes", "tls", "ssl", "data at rest", "data in transit", "key rotation", "pki", "certificate"],
        "Remote Work": ["remote", "vpn", "work from home", "wfh", "off-site", "hybrid", "telecommute"],
        "Cloud & Infrastructure": ["cloud", "aws", "azure", "gcp", "s3", "ec2", "iam", "bucket", "vm", "container", "kubernetes", "terraform"],
        "Change Management": ["change", "cab", "release", "deployment", "rollback", "approval", "ticket", "jira", "patch", "update"],
        "Data Retention": ["retention", "backup", "archive", "purge", "disposal", "gdpr", "delete", "log retention"],
        "Incident Response": ["incident", "breach", "sla", "severity", "escalation", "on-call", "alerting", "siem", "soc"],
        "Vendor Management": ["vendor", "third-party", "supplier", "contractor", "due diligence", "sow", "procurement"],
        "HR Policy": ["employee", "onboarding", "offboarding", "termination", "probation", "hr", "hiring", "background check", "pto", "leave"],
        "Compliance": ["audit", "compliance", "sox", "hipaa", "iso", "pci", "gdpr", "regulatory", "control", "framework"],
    }

    _CLAIM_TERMS = {
        "must", "shall", "required", "requires", "require", "mandatory",
        "optional", "allowed", "allow", "prohibited", "forbidden",
        "disallowed", "permitted", "retained", "retain", "rotated",
        "reviewed", "expires", "valid", "applies", "covers", "minimum",
        "maximum", "disabled", "enabled", "blocked", "approved",
        "approval", "submitted", "encrypted", "escalated", "suspended",
        "timeout", "time out", "classified",
    }

    _SECTION_HEADING_RE = re.compile(
        r"\b(PURPOSE|SCOPE|POLICY STATEMENTS|REQUIREMENTS|"
        r"RESPONSIBILITIES|EXCEPTIONS|GOVERNANCE|DEFINITIONS)\b:?",
        re.IGNORECASE,
    )
    _HEADER_TERMS = {
        "document version", "effective date", "review date",
        "classification", "policy owner",
    }

    def _detect_topic(self, text: str) -> str:
        """Fast keyword-scan to assign a topic to a chunk — no LLM needed."""
        lower = text.lower()
        best_topic, best_count = "General Policy", 0
        for topic, keywords in self._TOPIC_KEYWORDS.items():
            count = sum(1 for kw in keywords if kw in lower)
            if count > best_count:
                best_topic, best_count = topic, count
        return best_topic

    @staticmethod
    def _normalize_text(text: str) -> str:
        text = (
            text.replace("\ufb01", "fi")
            .replace("\ufb02", "fl")
            .replace("\u2010", "-")
            .replace("\u2011", "-")
            .replace("\u2012", "-")
            .replace("\u2013", "-")
            .replace("\u2014", "-")
        )
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\s*\n\s*", "\n", text)
        return text.strip()

    def _looks_like_claim(self, text: str) -> bool:
        if len(text) < 35:
            return False
        if len(text.split()) < 5:
            return False
        if text.isupper() and len(text) < 80:
            return False
        lower = text.lower()
        if any(term in lower for term in self._HEADER_TERMS) and not any(term in lower for term in self._CLAIM_TERMS):
            return False
        return any(term in lower for term in self._CLAIM_TERMS) or bool(re.search(r"\d", text))

    def _split_into_claim_units(self, text: str) -> List[str]:
        normalized = self._normalize_text(text)
        if not normalized:
            return []

        normalized = self._SECTION_HEADING_RE.sub(lambda m: f"\n{m.group(1).title()}:", normalized)
        normalized = re.sub(r"\s+(?=\d+\.\s+[A-Z])", "\n", normalized)
        normalized = re.sub(r"\s*[•*]\s+", "\n", normalized)

        units: list[str] = []
        for part in self.splitter.split_text(normalized):
            fragment = part.strip(" -\t")
            if not fragment:
                continue
            if fragment.endswith(":") and len(fragment) < 80:
                continue
            if self._looks_like_claim(fragment):
                units.append(fragment)

        deduped: list[str] = []
        seen: set[str] = set()
        for unit in units:
            key = re.sub(r"\W+", " ", unit.lower()).strip()
            if key and key not in seen:
                seen.add(key)
                deduped.append(unit)
        return deduped

    def process_and_extract_claims(self, docs: List[Document]) -> List[Document]:
        """
        Splits docs into small policy claim units and tags each with a heuristic topic.
        No LLM calls are made here — the LLM is reserved for the audit phase only.
        This keeps ingest fast (seconds, not hours).
        """
        logger.info("STAGE 2: Extracting and tagging claim units (heuristic, zero-LLM)")
        claim_docs = []

        for doc in docs:
            claim_units = self._split_into_claim_units(doc.page_content)

            for index, clean_text in enumerate(claim_units):
                topic = self._detect_topic(clean_text)
                new_meta = doc.metadata.copy()
                new_meta["claim_id"] = str(uuid.uuid4())
                new_meta["claim_index"] = index
                new_meta["topic"] = topic
                new_meta["subtopic"] = "General"
                logger.info("STAGE 3: Tagged claim %s -> %s", new_meta["claim_id"], topic)
                claim_docs.append(Document(page_content=clean_text, metadata=new_meta))

        # Sentinel: ensure at least one doc so the corpus is marked as indexed
        if not claim_docs and docs:
            logger.info("STAGE 3: No usable chunks found. Adding sentinel.")
            sentinel_meta = docs[0].metadata.copy()
            sentinel_meta["claim_id"] = str(uuid.uuid4())
            sentinel_meta["topic"] = "NO_CONTENT_FOUND"
            sentinel_meta["subtopic"] = "Sentinel"
            claim_docs.append(Document(page_content="[NO_CONTENT_FOUND]", metadata=sentinel_meta))

        return claim_docs

def classify_topic(text: str) -> str:
    """Module-level wrapper for the Chunker topic heuristic. Used in tests."""
    return Chunker.__new__(Chunker)._detect_topic(text)


class VectorStore:
    def __init__(self, corpus_id: str):
        persist_dir = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
        os.makedirs(persist_dir, exist_ok=True)
        # Use persistent Chroma for production durability
        self.db = Chroma(
            collection_name=f"corpus_{corpus_id}",
            embedding_function=None,
            persist_directory=persist_dir
        )

    def _ensure_embeddings(self) -> None:
        if getattr(self.db, "_embedding_function", None) is None:
            self.db._embedding_function = get_embeddings()
        
    def add_documents(self, documents: List[Document]):
        if not documents: return
        logger.info(f"STAGE 4: Generated embeddings and adding to VectorStore for {len(documents)} chunks")
        self._ensure_embeddings()
        ids = [str(doc.metadata.get("claim_id") or uuid.uuid4()) for doc in documents]
        self.db.add_documents(documents, ids=ids)
        
    def get_all_documents(self) -> List[Document]:
        results = self.db.get(include=["metadatas", "documents"])
        docs = []
        if not results or "documents" not in results:
            return docs
            
        for doc_text, meta in zip(results["documents"], results["metadatas"]):
            docs.append(Document(page_content=doc_text, metadata=meta))
        return docs
    
    def count(self) -> int:
        try:
            return self.db._collection.count()
        except Exception:
            res = self.db.get(include=["documents"])
            if not res or "documents" not in res:
                return 0
            return len(res["documents"])

    def similarity_search_with_score(self, query: str, **kwargs):
        self._ensure_embeddings()
        return self.db.similarity_search_with_score(query, **kwargs)

    def as_retriever(self, **kwargs):
        self._ensure_embeddings()
        return self.db.as_retriever(**kwargs)

class ContradictionDetector:
    _STOPWORDS = {
        "the", "and", "for", "that", "with", "from", "this", "into", "are",
        "must", "shall", "will", "have", "has", "all", "any", "each", "per",
        "where", "when", "which", "who", "their", "there", "within", "using",
        "use", "used", "only", "under", "over", "than", "then", "they", "them",
        "its", "our", "your", "policy", "requirement", "requirements",
        "company", "corporate", "document", "business", "process",
    }
    _CONFLICT_PAIRS = [
        ({"optional", "may"}, {"mandatory", "required", "must", "shall"}),
        ({"allowed", "permitted", "allow"}, {"prohibited", "forbidden", "disallowed", "blocked"}),
        ({"enabled", "enable"}, {"disabled", "disable"}),
        ({"automatic", "immediate", "immediately"}, {"manual", "approval", "approved"}),
    ]
    _UNITS = {
        "day", "days", "month", "months", "year", "years", "minute", "minutes",
        "hour", "hours", "character", "characters", "char", "chars", "mbps",
        "gbps", "percent", "tls", "aes", "bit", "bits",
    }

    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store

    @classmethod
    def _tokenize(cls, text: str) -> Set[str]:
        normalized = Chunker._normalize_text(text).lower()
        tokens = set(re.findall(r"[a-z][a-z0-9-]{2,}", normalized))
        return {token for token in tokens if token not in cls._STOPWORDS}

    @staticmethod
    def _numbers(text: str) -> Set[str]:
        return set(re.findall(r"\b\d+(?:\.\d+)?\b", text.lower()))

    @classmethod
    def _shared_units(cls, text_a: str, text_b: str) -> Set[str]:
        tokens_a = set(re.findall(r"[a-z]+", text_a.lower()))
        tokens_b = set(re.findall(r"[a-z]+", text_b.lower()))
        return (tokens_a & tokens_b) & cls._UNITS

    @classmethod
    def _has_conflict_signal(cls, text_a: str, text_b: str) -> bool:
        lower_a = text_a.lower()
        lower_b = text_b.lower()
        tokens_a = cls._tokenize(lower_a)
        tokens_b = cls._tokenize(lower_b)

        for left, right in cls._CONFLICT_PAIRS:
            if (tokens_a & left and tokens_b & right) or (tokens_b & left and tokens_a & right):
                return True

        numbers_a = cls._numbers(lower_a)
        numbers_b = cls._numbers(lower_b)
        if numbers_a and numbers_b and numbers_a != numbers_b:
            if cls._shared_units(lower_a, lower_b) or len(tokens_a & tokens_b) >= config.MIN_SHARED_TERMS:
                return True

        if ("minimum" in tokens_a and "maximum" in tokens_b) or ("maximum" in tokens_a and "minimum" in tokens_b):
            return len(tokens_a & tokens_b) >= config.MIN_SHARED_TERMS

        return False

    @staticmethod
    def _topics_compatible(topic_a: str, topic_b: str) -> bool:
        if not topic_a or not topic_b:
            return False
        if "NO_CONTENT_FOUND" in {topic_a, topic_b}:
            return False
        return True

    @classmethod
    def _worth_llm(cls, doc: Document, sim_doc: Document, cosine_sim: float) -> bool:
        text_a = doc.page_content
        text_b = sim_doc.page_content
        norm_a = re.sub(r"\W+", " ", text_a.lower()).strip()
        norm_b = re.sub(r"\W+", " ", text_b.lower()).strip()
        if not norm_a or not norm_b or norm_a == norm_b:
            return False

        tokens_a = cls._tokenize(text_a)
        tokens_b = cls._tokenize(text_b)
        shared = tokens_a & tokens_b
        has_conflict = cls._has_conflict_signal(text_a, text_b)

        if len(shared) < config.MIN_SHARED_TERMS and cosine_sim < 0.65:
            return False
        if not has_conflict and cosine_sim < 0.65:
            return False
        return True

    @staticmethod
    def _distance_to_similarity(distance: float) -> float:
        # With normalized embeddings, squared L2 distance maps to cosine similarity.
        return max(0.0, min(1.0, 1.0 - (distance / 2.0)))
        
    def generate_candidates(self) -> List[ContradictionCandidate]:
        """
        Retrieve likely contradiction pairs from different documents.
        Returns a list of ContradictionCandidates.
        """
        logger.info("STAGE 5: Retrieving candidate pairs")
        all_docs = [
            doc for doc in self.vector_store.get_all_documents()
            if doc.page_content and doc.metadata.get("topic") != "NO_CONTENT_FOUND"
        ]
        candidates: list[ContradictionCandidate] = []
        seen_pairs: set[tuple[str, str]] = set()
        query_k = min(max(config.TOP_K * 4, config.TOP_K), max(len(all_docs) - 1, 1))
        
        for doc in all_docs:
            doc_id = doc.metadata.get("document_id")
            claim_id = doc.metadata.get("claim_id")
            topic = doc.metadata.get("topic", "General Policy")

            similar_docs_with_scores = self.vector_store.similarity_search_with_score(
                doc.page_content,
                k=query_k,
                filter={"claim_id": {"$ne": claim_id}} if claim_id else None
            )
            
            for sim_doc, distance in similar_docs_with_scores:
                sim_topic = sim_doc.metadata.get("topic", "General Policy")
                if not self._topics_compatible(str(topic), str(sim_topic)):
                    continue

                cosine_sim = self._distance_to_similarity(distance)
                
                if cosine_sim < config.SIMILARITY_THRESHOLD:
                    continue

                if not self._worth_llm(doc, sim_doc, cosine_sim):
                    continue
                
                a = str(doc.metadata.get("claim_id", ""))
                b = str(sim_doc.metadata.get("claim_id", ""))
                pair_key = (a, b) if a < b else (b, a)
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)
                
                logger.info(
                    "STAGE 6: Candidate score %.4f for %s vs %s",
                    cosine_sim,
                    doc.metadata.get("claim_id"),
                    sim_doc.metadata.get("claim_id"),
                )
                
                candidates.append(ContradictionCandidate(
                    chunk_a_id=doc.metadata.get("claim_id", ""),
                    chunk_b_id=sim_doc.metadata.get("claim_id", ""),
                    claim_a=doc.page_content,
                    claim_b=sim_doc.page_content,
                    doc_a=str(doc.metadata.get("filename") or doc_id),
                    doc_b=str(sim_doc.metadata.get("filename") or sim_doc.metadata.get("document_id")),
                    page_a=int(doc.metadata.get("page", 0)) + 1,
                    page_b=int(sim_doc.metadata.get("page", 0)) + 1,
                    topic=str(topic),
                    cosine_similarity=cosine_sim
                ))

        candidates.sort(key=lambda c: c.cosine_similarity, reverse=True)
        if len(candidates) > config.MAX_CANDIDATES_TO_VERIFY:
            logger.info(
                "Capping candidates from %d to %d before LLM verification",
                len(candidates),
                config.MAX_CANDIDATES_TO_VERIFY,
            )
            candidates = candidates[:config.MAX_CANDIDATES_TO_VERIFY]
                
        logger.info("Generated %d candidates after topic and conflict prefilters.", len(candidates))
        return candidates

class EvidenceVerifier:
    _cache: dict[str, Tuple[bool, VerificationResponse, bool]] = {}
    _cache_lock = threading.Lock()

    @staticmethod
    def _cache_key(candidate: ContradictionCandidate) -> str:
        claims = sorted([
            re.sub(r"\s+", " ", candidate.claim_a.lower()).strip(),
            re.sub(r"\s+", " ", candidate.claim_b.lower()).strip(),
        ])
        return "|".join(claims)

    @staticmethod
    def verify(candidate: ContradictionCandidate) -> Tuple[bool, VerificationResponse, bool]:
        from typing import cast

        cache_key = EvidenceVerifier._cache_key(candidate)
        with EvidenceVerifier._cache_lock:
            cached = EvidenceVerifier._cache.get(cache_key)
            if cached:
                ok, response, discarded = cached
                return ok, response.model_copy(deep=True), discarded
        
        llm = get_llm().with_structured_output(ContradictionResult, method="json_mode")
        chain = (contradiction_verification_prompt | llm).with_retry(stop_after_attempt=3)
        
        logger.info(f"STAGE 7: Prompt sent to the LLM for {candidate.chunk_a_id} vs {candidate.chunk_b_id}")
        logger.info(f"Claim A: {candidate.claim_a}")
        logger.info(f"Claim B: {candidate.claim_b}")
        
        result = cast(ContradictionResult, chain.invoke({
            "claim_a": candidate.claim_a,
            "claim_b": candidate.claim_b
        }))
        

        logger.info(f"STAGE 8: Raw LLM response: {result}")
        
        resp = VerificationResponse(
            is_contradiction=result.contradiction,
            conflict_analysis=result.conflict_analysis,
            evidence_span_a=result.evidence_spans[0] if result.evidence_spans and len(result.evidence_spans) > 0 else candidate.claim_a,
            evidence_span_b=result.evidence_spans[1] if result.evidence_spans and len(result.evidence_spans) > 1 else candidate.claim_b,
            confidence=result.confidence,
            rationale=result.conflict_analysis,
        )
        
        logger.info(f"STAGE 9: Parsed JSON: {resp}")
        
        if resp.is_contradiction:
            # Log evidence spans for debugging — but do NOT reject based on them.
            # LLMs paraphrase; requiring verbatim substring matches kills valid contradictions.
            if resp.evidence_span_a:
                logger.info(f"Evidence span A: {resp.evidence_span_a[:80]}...")
            if resp.evidence_span_b:
                logger.info(f"Evidence span B: {resp.evidence_span_b[:80]}...")
                
            if resp.confidence <= 1:
                resp.confidence = round(resp.confidence * 100, 1)
            
            logger.info("STAGE 10: Final contradiction decision: ACCEPTED")
            outcome = (True, resp, False)
            with EvidenceVerifier._cache_lock:
                EvidenceVerifier._cache[cache_key] = outcome
            return True, resp.model_copy(deep=True), False
            
        logger.info("STAGE 10: Final contradiction decision: REJECTED")
        outcome = (True, resp, False)
        with EvidenceVerifier._cache_lock:
            EvidenceVerifier._cache[cache_key] = outcome
        return True, resp.model_copy(deep=True), False

class RiskScorer:
    _HIGH_TERMS = {
        "mfa", "multi-factor", "password", "credential", "privileged",
        "administrator", "admin", "encryption", "aes", "tls", "key",
        "confidential", "restricted", "pii", "breach", "incident",
        "security", "access", "authentication", "vpn", "siem", "ciso",
        "compliance", "regulatory", "audit",
    }
    _MEDIUM_TERMS = {
        "retention", "backup", "remote", "employee", "vendor", "approval",
        "exception", "review", "onboarding", "offboarding", "probation",
        "logging", "monitoring", "change", "release",
    }

    @staticmethod
    def score(topic: str, rationale: str, claim_a: str, claim_b: str) -> RiskLevel:
        """Deterministic risk scoring to avoid a second LLM call per finding."""
        text = f"{topic} {rationale} {claim_a} {claim_b}".lower()
        high_hits = sum(1 for term in RiskScorer._HIGH_TERMS if term in text)
        medium_hits = sum(1 for term in RiskScorer._MEDIUM_TERMS if term in text)

        if high_hits >= 2:
            return RiskLevel.HIGH
        if high_hits == 1 and re.search(r"\b(must|mandatory|required|prohibited|blocked)\b", text):
            return RiskLevel.HIGH
        if medium_hits >= 1 or high_hits == 1:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW
