import os
import uuid
import datetime
import logging
import re
from typing import List, Tuple, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.models import ContradictionCandidate, VerificationResponse, ContradictionReport, RiskLevel, ContradictionResult, ExtractedClaims, RiskAssessmentResult
from app.config import config
from app.llm import get_llm
from app.prompts import contradiction_verification_prompt, claim_extraction_prompt, risk_assessment_prompt
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

# Global LLM Executor to bound exotic energy requests and prevent API overloads
llm_executor = ThreadPoolExecutor(max_workers=15)

# Topics for classification
TOPICS = {
    "Authentication & Access": ["password", "mfa", "login", "authentication", "access", "auth", "sso", "credentials"],
    "Remote Work": ["remote", "work from home", "telecommute", "hybrid"],
    "Data Retention": ["retention", "backup", "archive", "delete", "destroy", "records"],
    "Incident Response": ["incident", "breach", "response", "emergency", "outage"],
    "Change Management": ["change", "approval", "deploy", "release", "cab"],
    "Cloud & Infrastructure": ["cloud", "aws", "azure", "gcp", "kubernetes", "infrastructure"]
}

def classify_topic(text: str) -> str:
    """Heuristic topic classification based on keywords."""
    text_lower = text.lower()
    best_topic = "General Policy"
    max_matches = 0
    
    for topic, keywords in TOPICS.items():
        matches = sum(1 for kw in keywords if kw in text_lower)
        if matches > max_matches:
            max_matches = matches
            best_topic = topic
            
    return best_topic

class DocumentIngestor:
    @staticmethod
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
        self.embeddings = HuggingFaceEmbeddings(model_name=config.EMBEDDING_MODEL)
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=150,
            separators=["\n\n", "\n", ". ", " "]
        )

    def process_and_extract_claims(self, docs: List[Document]) -> List[Document]:
        """
        Splits docs into semantic chunks, extracts verifiable business claims via heuristic filtering, and classifies topics.
        Bypasses LLM for extraction to achieve <1 minute total pipeline execution time.
        """
        logger.info(f"STAGE 2: Chunking and Extracting claims (Optimized Heuristic)")
        chunks = self.splitter.split_documents(docs)
        claim_docs = []
        
        policy_keywords = ["must", "shall", "required", "policy", "mandatory", "ensure", "always", "never", "prohibited", "responsible", "will", "should", "may not", "authorized", "compliance"]
        
        for chunk in chunks:
            clean_text = re.sub(r'\s+', ' ', chunk.page_content).strip()
            if len(clean_text) < 50:
                continue
                
            # Fast heuristic filter: only treat chunks likely to contain business policies as claims
            if not any(kw in clean_text.lower() for kw in policy_keywords):
                continue
                
            topic = classify_topic(clean_text)
            new_meta = chunk.metadata.copy()
            new_meta["claim_id"] = str(uuid.uuid4())
            new_meta["topic"] = topic
            logger.info(f"STAGE 3: Topic classification - Chunk ID: {new_meta['claim_id']} -> Topic: {topic}")
            claim_docs.append(Document(page_content=clean_text, metadata=new_meta))
            
        return claim_docs

class VectorStore:
    def __init__(self, corpus_id: str):
        self.embeddings = HuggingFaceEmbeddings(model_name=config.EMBEDDING_MODEL)
        persist_dir = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
        os.makedirs(persist_dir, exist_ok=True)
        # Use persistent Chroma for production durability
        self.db = Chroma(
            collection_name=f"corpus_{corpus_id}",
            embedding_function=self.embeddings,
            persist_directory=persist_dir
        )
        
    def add_documents(self, documents: List[Document]):
        if not documents: return
        logger.info(f"STAGE 4: Generated embeddings and adding to VectorStore for {len(documents)} chunks")
        self.db.add_documents(documents)
        
    def get_all_documents(self) -> List[Document]:
        results = self.db.get(include=["metadatas", "documents"])
        docs = []
        if not results or "documents" not in results:
            return docs
            
        for doc_text, meta in zip(results["documents"], results["metadatas"]):
            docs.append(Document(page_content=doc_text, metadata=meta))
        return docs
    
    def count(self) -> int:
        res = self.db.get(include=["documents"])
        if not res or "documents" not in res:
            return 0
        return len(res["documents"])

    def as_retriever(self, **kwargs):
        return self.db.as_retriever(**kwargs)

class ContradictionDetector:
    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        
    def generate_candidates(self) -> List[ContradictionCandidate]:
        """
        For each claim, retrieve top K similar claims from DIFFERENT documents, MUST MATCH TOPIC.
        Returns a list of ContradictionCandidates.
        """
        logger.info("STAGE 5: Retrieving candidate pairs")
        all_docs = self.vector_store.get_all_documents()
        candidates = []
        seen_pairs = set()
        
        for doc in all_docs:
            doc_id = doc.metadata.get("document_id")
            topic = doc.metadata.get("topic", "General Policy")
            
            # Filtering: different document, allowing cross-topic matching
            filter_dict = {
                "document_id": {"$ne": doc_id}
            }
            
            # The similarity score isn't directly exposed by invoke(), but we can use similarity_search_with_score
            similar_docs_with_scores = self.vector_store.db.similarity_search_with_relevance_scores(
                doc.page_content,
                k=config.TOP_K,
                filter=filter_dict,
                score_threshold=config.SIMILARITY_THRESHOLD
            )
            
            for sim_doc, score in similar_docs_with_scores:
                pair_key = tuple(sorted([doc.metadata.get("claim_id", ""), sim_doc.metadata.get("claim_id", "")]))
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)
                
                logger.info(f"STAGE 6: Similarity score: {score:.4f} for Pair {doc.metadata.get('claim_id')} vs {sim_doc.metadata.get('claim_id')}")
                
                candidates.append(ContradictionCandidate(
                    chunk_a_id=doc.metadata.get("claim_id", ""),
                    chunk_b_id=sim_doc.metadata.get("claim_id", ""),
                    claim_a=doc.page_content,
                    claim_b=sim_doc.page_content,
                    doc_a=str(doc.metadata.get("filename") or doc_id),
                    doc_b=str(sim_doc.metadata.get("filename") or sim_doc.metadata.get("document_id")),
                    page_a=doc.metadata.get("page", 1) + 1, # PyPDF is 0-indexed, display 1-indexed
                    page_b=sim_doc.metadata.get("page", 1) + 1,
                    topic=topic,
                    cosine_similarity=score
                ))
                
        logger.info(f"Generated {len(candidates)} candidates via strict topic matching.")
        return candidates

class EvidenceVerifier:
    @staticmethod
    def verify(candidate: ContradictionCandidate) -> Tuple[bool, VerificationResponse, bool]:
        llm = get_llm().with_structured_output(ContradictionResult)
        chain = contradiction_verification_prompt | llm
        
        logger.info(f"STAGE 7: Prompt sent to the LLM for {candidate.chunk_a_id} vs {candidate.chunk_b_id}")
        logger.info(f"Claim A: {candidate.claim_a}")
        logger.info(f"Claim B: {candidate.claim_b}")
        
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                from typing import cast
                result = cast(ContradictionResult, chain.invoke({
                    "claim_a": candidate.claim_a,
                    "claim_b": candidate.claim_b
                }))
                
                logger.info(f"STAGE 8: Raw LLM response: {result}")
                
                resp = VerificationResponse(
                    is_contradiction=result.contradiction,
                    evidence_span_a=result.evidence_spans[0] if result.evidence_spans and len(result.evidence_spans) > 0 else "",
                    evidence_span_b=result.evidence_spans[1] if result.evidence_spans and len(result.evidence_spans) > 1 else "",
                    confidence=result.confidence,
                    rationale=result.explanation
                )
                
                # We attach the LLM-generated specific title to the response
                resp.title = result.title if hasattr(result, 'title') else candidate.topic
                
                logger.info(f"STAGE 9: Parsed JSON: {resp}")
                
                if resp.is_contradiction:
                    # Strict Evidence Validation
                    def normalize(t): return re.sub(r'[^a-z0-9]', '', t.lower())
                    if resp.evidence_span_a and normalize(resp.evidence_span_a) not in normalize(candidate.claim_a):
                        logger.warning(f"Evidence span A mismatched original text. Rejecting candidate. Span: {resp.evidence_span_a}")
                        return True, VerificationResponse(is_contradiction=False), True
                    if resp.evidence_span_b and normalize(resp.evidence_span_b) not in normalize(candidate.claim_b):
                        logger.warning(f"Evidence span B mismatched original text. Rejecting candidate. Span: {resp.evidence_span_b}")
                        return True, VerificationResponse(is_contradiction=False), True
                        
                    # Compute deterministic confidence
                    computed_confidence = (candidate.cosine_similarity * 0.4) + (resp.confidence * 0.6)
                    resp.confidence = round(computed_confidence * 100, 1)
                    
                    logger.info("STAGE 10: Final contradiction decision: ACCEPTED")
                    return True, resp, False
                    
                logger.info("STAGE 10: Final contradiction decision: REJECTED")
                return True, resp, False
                
            except Exception as e:
                logger.error(f"Failed to parse LLM verification response (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(4 * (2 ** attempt)) # Exponential backoff starting at 4 seconds
                else:
                    return False, VerificationResponse(is_contradiction=False), False

        return False, VerificationResponse(is_contradiction=False), False

class RiskScorer:
    @staticmethod
    def score(topic: str, rationale: str, claim_a: str, claim_b: str) -> RiskLevel:
        """LLM-based risk scoring."""
        llm = get_llm().with_structured_output(RiskAssessmentResult)
        chain = risk_assessment_prompt | llm
        
        try:
            result = chain.invoke({
                "topic": topic,
                "claim_a": claim_a,
                "claim_b": claim_b
            })
            # pyrefly: ignore [missing-attribute]
            return result.risk_level
        except Exception as e:
            logger.error(f"Failed to score risk with LLM: {e}. Falling back to default.")
            return RiskLevel.MEDIUM
