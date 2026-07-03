import React, { useState, useRef, useEffect } from 'react';
import { Upload, File, Play, X, Activity, AlertTriangle, FileText, BarChart3, ArrowRight, Loader2, CheckCircle2, Clock } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { API_BASE_URL, API_KEY } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisPipeline } from './AnalysisPipeline';
import type { AuditReport } from '../types';

const ExecutionTimer = React.memo(({ isUploading }: { isUploading: boolean }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isUploading) {
      interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

  return (
    <div className="flex items-center gap-2 text-xs font-mono font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20">
      <Clock size={14} />
      <span>{Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
    </div>
  );
});
ExecutionTimer.displayName = 'ExecutionTimer';

export function Dashboard() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { analyses, addAnalysis } = useWorkspace();
  const abortControllerRef = useRef<AbortController | null>(null);

  const STAGES = [
    'Idle',
    'Ingesting Documents',
    'Extracting & Classifying Claims',
    'Generating Vector Embeddings',
    'Topic-Filtered Retrieval',
    'LLM Verification & Scoring',
    'Finalizing Report'
  ];

  // Derived Metrics
  const totalDocuments = analyses.reduce((acc, curr) => acc + curr.total_documents, 0);
  const [ingestStats, setIngestStats] = useState<{ claims: number, files: number } | null>(null);


  const latestHealth = analyses.length > 0 ? analyses[0].health_score : 100;
  const criticalFindings = analyses.reduce((acc, curr) => {
    return acc + curr.contradictions.filter(c => c.risk_level === 'high' && c.status === 'Open').length;
  }, 0);

  const handleFileChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const removeFile = React.useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAudit = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setIngestStats(null);
    setErrorMessage('');
    abortControllerRef.current = new AbortController();
    
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const corpusId = `corpus_${Date.now()}`;
    formData.append('corpus_id', corpusId);

    try {
      setCurrentStage(1);
      setStatusMessage('Extracting & Classifying Business Claims...');
      
      const ingestResponse = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST',
        body: formData,
        headers: { 'X-API-Key': API_KEY },
        signal: abortControllerRef.current.signal
      });

      if (!ingestResponse.ok) {
        let errorMsg = 'Ingest failed';
        try {
          const errorData = await ingestResponse.json();
          if (errorData?.detail) errorMsg = errorData.detail;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const ingestData = await ingestResponse.json();
      setIngestStats({ claims: ingestData.claims_ingested, files: ingestData.filenames.length });

      setCurrentStage(3);
      setStatusMessage('Running topic-filtered vector retrieval...');

      const auditResponse = await fetch(`${API_BASE_URL}/audit?corpus_id=${corpusId}`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY },
        signal: abortControllerRef.current.signal
      });

      if (!auditResponse.ok) throw new Error('Audit failed');

      setCurrentStage(6);
      setStatusMessage('Generating Final Report...');

      const reportData = await auditResponse.json();
      
      if (reportData.total_documents !== files.length) {
        throw new Error(`Corrupted Pipeline State: Expected ${files.length} documents, but analyzed ${reportData.total_documents}`);
      }
      
      const analysisData = {
        ...reportData,
        name: `Analysis Run — ${files.length} Docs`,
        timestamp: new Date().toISOString()
      };
      
      addAnalysis(analysisData);
      
      setTimeout(() => {
        navigate(`/analyses/${reportData.audit_id}`);
      }, 500);

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        setStatusMessage('Analysis cancelled.');
      } else {
        console.error('Audit failed:', error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(`Pipeline failed: ${msg}`);
        setStatusMessage('');
      }
    } finally {
      if (abortControllerRef.current) {
        setIsUploading(false);
        setCurrentStage(0);
        abortControllerRef.current = null;
      }
    }
  };

  const handleCancel = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setFiles([]);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-7xl mx-auto p-8 pb-32"
    >
      
      <div className="flex items-center justify-between mb-10">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-heading font-bold text-primary tracking-tight"
          >
            Dashboard
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-secondary text-sm mt-2 font-medium tracking-wide uppercase"
          >
            Enterprise Knowledge Health & Pipeline Status
          </motion.p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Upload Zone */}
          <div className="bg-surface rounded-xl border border-borderLight shadow-sm relative group focus-ring overflow-hidden" tabIndex={0} aria-label="Analysis Pipeline Upload Zone">
            <div className="p-8 h-full relative z-10">
              {!isUploading ? (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-heading font-semibold text-primary flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center border border-accent/20">
                        <Activity size={16} />
                      </span>
                      New Analysis Pipeline
                    </h2>
                    {files.length > 0 && (
                      <button onClick={handleCancel} className="p-2 text-tertiary hover:text-critical rounded-full hover:bg-critical/10 transition-colors">
                        <X size={18} strokeWidth={2.5}/>
                      </button>
                    )}
                  </div>

                  <div 
                    className="relative border border-dashed border-borderStrong rounded-xl p-14 text-center hover:border-accent hover:bg-accent/5 transition-all duration-200 cursor-pointer group/upload overflow-hidden focus-ring"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
                    tabIndex={0}
                    role="button"
                    aria-label="Click or press enter to upload PDF files"
                  >
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.txt,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      ref={fileInputRef}
                    />
                    <div className="w-16 h-16 rounded-2xl bg-elevated border border-borderLight mx-auto flex items-center justify-center mb-6 shadow-card group-hover/upload:scale-105 transition-all duration-200 relative">
                      <Upload size={24} className={files.length > 0 ? "text-accent" : "text-tertiary group-hover/upload:text-accent transition-colors duration-200"} />
                    </div>
                    <h3 className="text-lg font-medium text-primary mb-2">Upload knowledge documents</h3>
                    <p className="text-sm text-secondary">Select multiple PDFs for cross-referencing and contradiction analysis.</p>
                  </div>

                  {files.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-8 space-y-4"
                    >
                      <h4 className="text-xs font-bold text-tertiary uppercase tracking-[0.2em] mb-3">Selected Files</h4>
                      <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {files.map((f, i) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            key={i} 
                            className="flex items-center justify-between p-4 bg-background/50 border border-borderLight rounded-xl group hover:border-accent/30 transition-colors duration-200"
                          >
                            <div className="flex items-center gap-4 overflow-hidden">
                              <div className="w-10 h-10 rounded-lg bg-elevated border border-borderLight flex items-center justify-center text-accent shrink-0 shadow-sm">
                                <File size={18} />
                              </div>
                              <span className="text-sm font-medium text-primary truncate">{f.name}</span>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                              aria-label={`Remove file ${f.name}`}
                              className="p-2 text-tertiary hover:text-critical hover:bg-critical/10 rounded-lg transition-colors duration-200 focus-ring"
                            >
                              <X size={16} />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                      
                      <div className="pt-8 flex justify-end gap-4 border-t border-borderLight/50 mt-8">
                        <button 
                          onClick={handleCancel}
                          className="px-5 py-2.5 text-sm text-secondary font-medium hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAudit}
                          disabled={isUploading}
                          className="relative px-8 py-2.5 bg-accent text-white font-medium rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(129,140,248,0.4)] hover:bg-accentHover transition-all duration-200 text-sm overflow-hidden group/btn focus-ring disabled:opacity-70"
                        >
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-200 ease-out" />
                          <Play size={16} fill="currentColor" className="relative z-10" />
                          <span className="relative z-10">Execute Pipeline</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full flex flex-col relative overflow-hidden rounded-2xl border border-borderLight/30 bg-background shadow-2xl"
                >
                  <div className="noise-overlay" />
                  {/* Header */}
                  <div className="border-b border-borderLight/30 px-6 py-5 flex items-center justify-between bg-surface/80 backdrop-blur-md relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center w-8 h-8">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                          className="absolute inset-0 rounded-full border-2 border-accent/20 border-t-accent"
                        />
                        <Loader2 size={14} className="text-accent" />
                      </div>
                      <h2 className="text-sm font-semibold text-primary tracking-wide">Enterprise Pipeline Execution</h2>
                    </div>
                    <ExecutionTimer isUploading={isUploading} />
                  </div>
                  
                  {/* Content */}
                  <div className="p-8 relative z-10 bg-gradient-to-b from-surface/50 to-background">
                    {/* Status Indicator */}
                    <div className="mb-10 relative" aria-live="polite">
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] text-accent font-bold mb-3 uppercase tracking-[0.3em]"
                      >
                        Current Operation
                      </motion.p>
                      <AnimatePresence mode="wait">
                        <motion.p 
                          key={statusMessage || STAGES[currentStage]}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="text-2xl text-primary font-heading font-medium tracking-tight text-gradient"
                        >
                          {statusMessage || STAGES[currentStage]}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                    
                    {/* Glowing Pulse Background for Active Stage */}
                    <div className="absolute top-1/3 right-10 w-64 h-64 bg-accent/20 rounded-full blur-[80px] pointer-events-none mix-blend-screen" />

                    {/* Real Stats Box (appears after ingest) */}
                    <AnimatePresence>
                      {ingestStats && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0, y: 20 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          className="overflow-hidden mb-10"
                        >
                          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6 backdrop-blur-xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                            <div className="grid grid-cols-3 gap-6 text-center relative z-10">
                              <div>
                                <p className="text-[10px] text-accent font-bold uppercase tracking-[0.2em] mb-2">Docs Parsed</p>
                                <motion.p 
                                  initial={{ scale: 0.5 }}
                                  animate={{ scale: 1 }}
                                  className="text-3xl font-heading font-semibold text-primary"
                                >
                                  {ingestStats.files}
                                </motion.p>
                              </div>
                              <div className="border-l border-r border-accent/10">
                                <p className="text-[10px] text-accent font-bold uppercase tracking-[0.2em] mb-2">Claims Extracted</p>
                                <motion.p 
                                  initial={{ scale: 0.5 }}
                                  animate={{ scale: 1 }}
                                  className="text-3xl font-heading font-semibold text-primary"
                                >
                                  {ingestStats.claims}
                                </motion.p>
                              </div>
                              <div>
                                <p className="text-[10px] text-accent font-bold uppercase tracking-[0.2em] mb-2">Vectorization</p>
                                <p className="text-lg font-semibold text-success flex items-center justify-center gap-2 h-10 mt-1">
                                  <CheckCircle2 size={20}/> 100%
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 3D Pipeline Visualization */}
                    <div className="mt-8 relative w-full">
                      <AnalysisPipeline 
                        activeStage={currentStage} 
                        filename={files.length > 0 ? `${files.length} document(s)` : 'Knowledge Corpus'} 
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-critical/10 border border-critical/30 rounded-2xl p-5 flex items-start gap-4 shadow-lg backdrop-blur-md"
              >
                <div className="w-10 h-10 rounded-full bg-critical/20 flex items-center justify-center shrink-0 border border-critical/30">
                  <AlertTriangle size={20} className="text-critical" />
                </div>
                <div className="flex-1 mt-0.5">
                  <p className="text-sm font-semibold text-critical">{errorMessage}</p>
                  <p className="text-xs text-secondary mt-1">Check that the backend is running and try again.</p>
                </div>
                <button onClick={() => setErrorMessage('')} className="p-2 text-critical/60 hover:text-critical hover:bg-critical/10 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Analyses */}
          <div className="pt-6">
            <h2 className="text-[10px] font-bold text-tertiary mb-6 uppercase tracking-[0.2em] ml-2">Recent Audit Reports</h2>
            <div className="grid grid-cols-1 gap-4">
              {analyses.length === 0 ? (
                <div className="p-12 text-center text-tertiary glass rounded-3xl border border-borderLight border-dashed">
                  <div className="w-16 h-16 rounded-full bg-elevated border border-borderLight mx-auto flex items-center justify-center mb-4">
                    <BarChart3 size={24} className="opacity-40" />
                  </div>
                  <p className="text-sm font-medium">No analyses completed yet.</p>
                  <p className="text-xs mt-2 opacity-60">Run a new analysis to generate insights.</p>
                </div>
              ) : (
                analyses.map((analysis) => (
                  <RecentAnalysisCard 
                    key={analysis.audit_id} 
                    analysis={analysis} 
                    onClick={() => navigate(`/analyses/${analysis.audit_id}`)} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
        <div className="space-y-6 lg:pl-4">
          <StatCard 
            title="Overall Health" 
            value={latestHealth.toFixed(1)} 
            subtitle={`Based on ${totalDocuments} analyzed files.`} 
            suffix="/ 100" 
            icon={<Activity size={16} className="text-success" />} 
            colorClass="success" 
          />
          <StatCard 
            title="Open Findings" 
            value={criticalFindings.toString()} 
            suffix="Critical" 
            icon={<AlertTriangle size={16} className={criticalFindings > 0 ? "text-critical" : ""} />} 
            colorClass="critical" 
          />
          <StatCard 
            title="Knowledge Base" 
            value={totalDocuments.toString()} 
            suffix="PDFs" 
            icon={<FileText size={16} className="text-accent" />} 
            colorClass="accent" 
          />
        </div>
      </div>
    </motion.div>
  );
}

// Sub-components wrapped in React.memo for performance

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  suffix?: string;
  icon: React.ReactNode;
  colorClass: 'success' | 'critical' | 'accent';
}

const StatCard = React.memo(({ title, value, subtitle, suffix, icon, colorClass }: StatCardProps) => {
  const colorMap = {
    success: 'bg-success/10 group-hover:bg-success/20',
    critical: 'bg-critical/10 group-hover:bg-critical/20',
    accent: 'bg-accent/10 group-hover:bg-accent/20'
  };

  return (
    <div className="glass-elevated rounded-3xl p-8 relative overflow-hidden group" tabIndex={0} aria-label={`${title}: ${value}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors duration-200 ${colorMap[colorClass]}`} />
      <div className="flex items-center gap-3 text-secondary mb-6 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-surface border border-borderLight flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{title}</span>
      </div>
      <div className="flex items-end gap-2 relative z-10">
        <span className="text-5xl font-heading font-bold text-primary tracking-tight">{value}</span>
        {suffix && (
          <span className="text-sm font-medium text-secondary mb-2 bg-elevated px-2 py-0.5 rounded border border-borderLight">
            {suffix}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="mt-6 pt-4 border-t border-borderLight/50">
          <p className="text-xs text-secondary">{subtitle}</p>
        </div>
      )}
    </div>
  );
});

StatCard.displayName = 'StatCard';

interface RecentAnalysisCardProps {
  analysis: AuditReport;
  onClick: () => void;
}

const RecentAnalysisCard = React.memo(({ analysis, onClick }: RecentAnalysisCardProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.24 }}
    onClick={onClick}
    onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    role="button"
    tabIndex={0}
    aria-label={`View analysis report for ${analysis.name || 'Knowledge Audit Run'}`}
    className="glass p-5 rounded-2xl hover:border-accent/40 transition-all duration-200 cursor-pointer group focus-ring relative overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-r from-accent/0 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    <div className="flex items-center justify-between relative z-10">
      <div>
        <h3 className="text-base font-medium text-primary flex items-center gap-3">
          {analysis.name || 'Knowledge Audit Run'}
          {analysis.contradictions_found > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-risk-high/10 border border-risk-high/20 text-risk-high text-[10px] font-bold uppercase tracking-wider">
              {analysis.contradictions_found} Risks
            </span>
          )}
        </h3>
        <p className="text-xs text-secondary mt-2 font-mono">
          {new Date(analysis.timestamp || '').toLocaleString()} <span className="mx-2 opacity-30">|</span> {analysis.total_documents} documents processed
        </p>
      </div>
      <div className="w-10 h-10 rounded-full bg-elevated border border-borderLight flex items-center justify-center group-hover:bg-accent group-hover:border-accent group-hover:text-white transition-all duration-200 shadow-sm">
        <ArrowRight size={16} />
      </div>
    </div>
  </motion.div>
));

RecentAnalysisCard.displayName = 'RecentAnalysisCard';
