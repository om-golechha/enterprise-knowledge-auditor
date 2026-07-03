import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ChevronRight, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PdfEvidenceViewer } from './PdfEvidenceViewer';
import type { ContradictionReport, ReportStatus } from '../types';

interface Props {
  data: ContradictionReport;
  corpusId?: string;
  onStatusUpdate?: (newStatus: ReportStatus) => void;
}

const severityColors: Record<string, string> = {
  low: 'text-risk-low',
  medium: 'text-risk-medium',
  high: 'text-risk-high',
};

const statusColors: Record<ReportStatus, string> = {
  'Open': 'text-risk-high bg-risk-high/10 border-risk-high/20',
  'Under Review': 'text-risk-medium bg-risk-medium/10 border-risk-medium/20',
  'Resolved': 'text-risk-low bg-risk-low/10 border-risk-low/20',
  'Ignored': 'text-muted bg-elevated border-borderLight',
};

export const ContradictionCard: React.FC<Props> = ({ data, corpusId, onStatusUpdate }) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState<ReportStatus>(data.status || 'Open');

  const handleStatusChange = (newStatus: ReportStatus) => {
    setLocalStatus(newStatus);
    if (onStatusUpdate) {
      onStatusUpdate(newStatus);
    }
  };

  const isResolved = localStatus === 'Resolved' || localStatus === 'Ignored';

  return (
    <>
      <motion.div 
        layout
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-card rounded-xl mb-3 border cursor-pointer transition-all duration-200 overflow-hidden group ${
          isResolved ? 'opacity-70 hover:opacity-100 border-borderLight' : 'border-borderLight hover:border-gray-600 shadow-sm'
        }`}
        onClick={() => setViewerOpen(true)}
      >
        <div className="p-4 flex items-start justify-between relative z-10">
          <div className="flex items-start gap-4">
            <div className={`mt-0.5 p-2 rounded-md flex items-center justify-center bg-elevated border border-borderLight ${
              isResolved ? 'text-muted' : severityColors[data.risk_level]
            }`}>
              {isResolved ? <CheckCircle2 size={18} strokeWidth={2} /> : <ShieldAlert size={18} strokeWidth={2} />}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-1">
                <h3 className={`text-base font-semibold tracking-tight ${isResolved ? 'text-gray-400' : 'text-gray-100'}`}>
                  {data.topic}
                </h3>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${statusColors[localStatus]}`}>
                  {localStatus}
                </span>
                {!isResolved && (
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border border-borderLight ${severityColors[data.risk_level]}`}>
                    {data.risk_level} Risk
                  </span>
                )}
              </div>
              
              <div className="text-sm text-gray-300 mb-3 leading-relaxed">
                {data.rationale}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-background border border-borderLight rounded-md">
                  <span className="flex items-center gap-1.5 text-xs font-mono text-muted">
                    <FileText size={12} strokeWidth={2} /> {data.source_doc_a} 
                    <ArrowRight size={12} strokeWidth={2} className="text-gray-600 mx-1" /> 
                    <FileText size={12} strokeWidth={2} /> {data.source_doc_b}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 px-2 py-1 bg-background border border-borderLight rounded-md">
                  <span className="text-xs font-mono text-muted">
                    Confidence: {data.confidence.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-center pl-4">
            <div className="hidden group-hover:flex items-center gap-2 mr-2" onClick={(e) => e.stopPropagation()}>
              {localStatus !== 'Resolved' && (
                <button 
                  onClick={() => handleStatusChange('Resolved')}
                  className="px-3 py-1.5 bg-background border border-borderLight hover:bg-risk-low/10 hover:border-risk-low/30 hover:text-risk-low text-xs font-medium text-primary rounded-md transition-all"
                >
                  Resolve
                </button>
              )}
              {localStatus === 'Resolved' && (
                <button 
                  onClick={() => handleStatusChange('Open')}
                  className="px-3 py-1.5 hover:bg-elevated text-xs font-medium text-muted rounded transition-colors"
                >
                  Reopen
                </button>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-elevated border border-borderLight flex items-center justify-center text-muted group-hover:text-primary group-hover:border-gray-500 transition-all">
              <ChevronRight size={18} strokeWidth={2} />
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {viewerOpen && (
          <PdfEvidenceViewer 
            report={{...data, status: localStatus}} 
            corpusId={corpusId}
            onStatusChange={handleStatusChange}
            onClose={() => setViewerOpen(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
};
