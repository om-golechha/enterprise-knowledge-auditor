export type RiskLevel = 'low' | 'medium' | 'high';
export type ReportStatus = 'Open' | 'Under Review' | 'Resolved' | 'Ignored';

export interface ContradictionReport {
  claim_a: string;
  source_doc_a: string;
  page_a: number;
  claim_b: string;
  source_doc_b: string;
  page_b: number;
  topic: string;
  confidence: number;
  risk_level: RiskLevel;
  status: ReportStatus;
  evidence_span_a: string;
  evidence_span_b: string;
  rationale: string;
}

export interface AuditReport {
  audit_id: string;
  corpus_id: string;
  total_documents: number;
  total_claims_extracted: number;
  candidates_checked: number;
  contradictions_found: number;
  discarded_unverified: number;
  health_score: number;
  contradictions: ContradictionReport[];
  timestamp?: string;
  name?: string;
}
