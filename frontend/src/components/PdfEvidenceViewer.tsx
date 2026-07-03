import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Maximize2, Minimize2, X, GitPullRequest, Search, CheckCircle2, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL, API_KEY } from '../config';
import type { ContradictionReport, ReportStatus } from '../types';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

interface PdfEvidenceViewerProps {
  report: ContradictionReport;
  corpusId?: string;
  onStatusChange: (newStatus: ReportStatus) => void;
  onClose: () => void;
}

const severityColors: Record<string, string> = {
  low: 'text-risk-low',
  medium: 'text-risk-medium',
  high: 'text-risk-high',
};

export const PdfEvidenceViewer: React.FC<PdfEvidenceViewerProps> = ({ report, corpusId, onStatusChange, onClose }) => {
  const [expanded, setExpanded] = useState(false);
  
  const [scaleA, setScaleA] = useState(1.0);
  const [scaleB, setScaleB] = useState(1.0);

  const [errorA, setErrorA] = useState<Error | null>(null);
  const [errorB, setErrorB] = useState<Error | null>(null);

  const pdfOptions = React.useMemo(() => ({
    httpHeaders: { 'X-API-Key': API_KEY }
  }), []);

  const handleStatusUpdate = (status: ReportStatus) => {
    onStatusChange(status);
  };

  const getPdfUrl = (docName: string) => {
    if (!docName) return '';
    const filename = docName.includes('/') ? docName.split('/').pop() || docName : docName;
    const encodedFilename = encodeURIComponent(filename);
    if (corpusId) {
      return `${API_BASE_URL}/documents/${encodeURIComponent(corpusId)}/${encodedFilename}`;
    }
    return `${API_BASE_URL}/documents/${encodedFilename}`;
  };

  const highlightText = useCallback((textItem: any, targetText: string, colorClass: string) => {
    if (!textItem || !textItem.str) return textItem.str;
    
    // Very basic highlighting logic for text layer. 
    // For enterprise production, a robust coordinate-based highlighter is better,
    // but this suffices for the text layer if exact string matches.
    const cleanTarget = targetText.trim();
    if (!cleanTarget) return textItem.str;

    // Split target into chunks for better matching across lines
    const words = cleanTarget.split(' ').filter(w => w.length > 3);
    if (words.length === 0) return textItem.str;

    let highlighted = false;
    for (const word of words) {
       if (textItem.str.toLowerCase().includes(word.toLowerCase())) {
         highlighted = true;
         break;
       }
    }

    if (highlighted) {
      return `<mark class="${colorClass} bg-opacity-40 rounded px-0.5 text-transparent">${textItem.str}</mark>`;
    }
    return textItem.str;
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 ${expanded ? 'p-0' : ''}`}
    >
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={onClose} />
      
      <motion.div 
        initial={{ y: 20, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 10, scale: 0.98 }}
        className={`relative flex flex-col bg-card border border-borderLight shadow-elevated overflow-hidden transition-all duration-200 ${expanded ? 'w-full h-full rounded-none' : 'w-[95vw] h-[90vh] max-w-[1400px] rounded-xl'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-borderLight bg-surface shrink-0">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-background border border-borderLight shadow-sm ${severityColors[report.risk_level]}`}>
              <GitPullRequest size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-xl font-heading font-semibold text-primary">{report.topic}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border border-borderLight ${report.status === 'Resolved' ? 'bg-risk-low/10 text-risk-low' : 'bg-background text-primary'}`}>
                  {report.status}
                </span>
                <span className="text-xs font-mono text-muted flex items-center gap-1">
                  Confidence: {report.confidence.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button aria-label={expanded ? "Minimize viewer" : "Maximize viewer"} onClick={() => setExpanded(!expanded)} className="p-2.5 text-tertiary hover:text-primary rounded-lg hover:bg-elevated transition-colors border border-transparent hover:border-borderLight focus-ring">
              {expanded ? <Minimize2 size={18} strokeWidth={2} /> : <Maximize2 size={18} strokeWidth={2} />}
            </button>
            <button aria-label="Close viewer" onClick={onClose} className="p-2.5 text-tertiary hover:text-primary rounded-lg hover:bg-elevated transition-colors border border-transparent hover:border-borderLight focus-ring">
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Main Content Area: 2-Column Split */}
        <div className="flex-1 flex overflow-hidden bg-background relative">
          
          {/* Left: Source A */}
          <div className="flex-1 flex flex-col border-r border-borderLight min-w-0">
            <div className="px-4 py-3 bg-surface border-b border-borderLight flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-accent/10 text-accent border border-accent/20 rounded text-[10px] font-mono font-bold uppercase tracking-wider">Source A</span>
                <span className="text-sm font-medium text-primary">{report.source_doc_a}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-elevated rounded-md border border-borderLight">
                  <button aria-label="Zoom out document A" onClick={() => setScaleA(s => Math.max(0.5, s - 0.25))} className="p-1.5 text-tertiary hover:text-primary focus-ring rounded-l-md"><ZoomOut size={14}/></button>
                  <span className="text-xs font-mono w-10 text-center text-secondary">{Math.round(scaleA * 100)}%</span>
                  <button aria-label="Zoom in document A" onClick={() => setScaleA(s => Math.min(2.5, s + 0.25))} className="p-1.5 text-tertiary hover:text-primary focus-ring rounded-r-md"><ZoomIn size={14}/></button>
                </div>
                <div className="flex items-center bg-elevated rounded-md border border-borderLight px-2 py-1">
                   <span className="text-xs text-secondary font-medium">Page {report.page_a}</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative overflow-auto p-4 sm:p-8 flex justify-center items-start bg-[#0a0a0a]">
              <div className="bg-white shadow-elevated rounded overflow-hidden">
                <Document 
                  file={{ url: getPdfUrl(report.source_doc_a) }} 
                  options={pdfOptions}
                  loading={<div className="p-20 text-muted flex flex-col items-center gap-4"><Loader2 className="animate-spin text-accent" size={24}/> <span className="text-sm">Loading Document A...</span></div>}
                  error={
                    <div className="p-10 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-critical/10 text-critical rounded-full flex items-center justify-center mb-4">
                        <X size={24} strokeWidth={1.5} />
                      </div>
                      <h3 className="text-sm font-bold text-critical mb-2">Failed to load Evidence A</h3>
                      <p className="text-xs text-secondary max-w-xs">{errorA?.message || "Unable to fetch the document. Check network or CORS."}</p>
                    </div>
                  }
                  onLoadError={setErrorA}
                  onSourceError={setErrorA}
                >
                   <Page 
                     pageNumber={report.page_a || 1} 
                     scale={scaleA}
                     renderTextLayer={true} 
                     renderAnnotationLayer={false}
                     className="pdf-page"
                     customTextRenderer={(textItem) => highlightText(textItem, report.evidence_span_a, "bg-blue-400")}
                   />
                </Document>
              </div>
            </div>
            
            <div className="p-4 bg-surface border-t border-borderLight shrink-0 z-10">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">
                Original Claim
              </h4>
              <p className="text-sm text-primary p-3 bg-background rounded-md border border-borderLight font-mono leading-relaxed overflow-y-auto max-h-24">
                {report.evidence_span_a}
              </p>
            </div>
          </div>

          {/* Right: Source B */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-3 bg-surface border-b border-borderLight flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-critical/10 text-critical border border-critical/20 rounded text-[10px] font-mono font-bold uppercase tracking-wider">Source B</span>
                <span className="text-sm font-medium text-primary">{report.source_doc_b}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-elevated rounded-md border border-borderLight">
                  <button aria-label="Zoom out document B" onClick={() => setScaleB(s => Math.max(0.5, s - 0.25))} className="p-1.5 text-tertiary hover:text-primary focus-ring rounded-l-md"><ZoomOut size={14}/></button>
                  <span className="text-xs font-mono w-10 text-center text-secondary">{Math.round(scaleB * 100)}%</span>
                  <button aria-label="Zoom in document B" onClick={() => setScaleB(s => Math.min(2.5, s + 0.25))} className="p-1.5 text-tertiary hover:text-primary focus-ring rounded-r-md"><ZoomIn size={14}/></button>
                </div>
                <div className="flex items-center bg-elevated rounded-md border border-borderLight px-2 py-1">
                   <span className="text-xs text-secondary font-medium">Page {report.page_b}</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative overflow-auto p-4 sm:p-8 flex justify-center items-start bg-[#0a0a0a]">
              <div className="bg-white shadow-elevated rounded overflow-hidden">
                <Document 
                  file={{ url: getPdfUrl(report.source_doc_b) }} 
                  options={pdfOptions}
                  loading={<div className="p-20 text-muted flex flex-col items-center gap-4"><Loader2 className="animate-spin text-critical" size={24}/> <span className="text-sm">Loading Document B...</span></div>}
                  error={
                    <div className="p-10 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-critical/10 text-critical rounded-full flex items-center justify-center mb-4">
                        <X size={24} strokeWidth={1.5} />
                      </div>
                      <h3 className="text-sm font-bold text-critical mb-2">Failed to load Evidence B</h3>
                      <p className="text-xs text-secondary max-w-xs">{errorB?.message || "Unable to fetch the document. Check network or CORS."}</p>
                    </div>
                  }
                  onLoadError={setErrorB}
                  onSourceError={setErrorB}
                >
                   <Page 
                     pageNumber={report.page_b || 1} 
                     scale={scaleB}
                     renderTextLayer={true} 
                     renderAnnotationLayer={false}
                     className="pdf-page"
                     customTextRenderer={(textItem) => highlightText(textItem, report.evidence_span_b, "bg-red-400")}
                   />
                </Document>
              </div>
            </div>
            
            <div className="p-4 bg-surface border-t border-borderLight shrink-0 z-10">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">
                Conflicting Claim
              </h4>
              <p className="text-sm text-primary p-3 bg-background rounded-md border border-borderLight font-mono leading-relaxed overflow-y-auto max-h-24">
                {report.evidence_span_b}
              </p>
            </div>
          </div>

          {/* Floating Rationale and Action Panel */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-elevated border border-borderStrong shadow-md rounded-xl p-5 flex flex-col gap-4 z-20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2"><Search size={16} className="text-accent" /> AI Rationale</h3>
                <p className="text-sm text-primary leading-relaxed bg-background p-3 rounded-md border border-borderLight">
                  {report.rationale}
                </p>
              </div>
              <div className="w-48 shrink-0 flex flex-col gap-2">
                <button 
                  onClick={() => { handleStatusUpdate('Resolved'); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-background rounded-md text-sm font-semibold hover:bg-gray-200 transition-colors focus-ring"
                >
                  <CheckCircle2 size={16} strokeWidth={2.5} /> Mark as Resolved
                </button>
                <button 
                  onClick={() => { handleStatusUpdate('Ignored'); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-transparent border border-borderStrong text-secondary rounded-md text-sm font-medium hover:text-primary hover:bg-surface transition-colors focus-ring"
                >
                  Ignore Finding
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </motion.div>
    </motion.div>
  );
};
