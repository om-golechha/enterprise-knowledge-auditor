import React, { useState, useRef, useEffect } from 'react';
import { Upload, File, Play, X, Activity, AlertTriangle, FileText, BarChart3, ArrowRight, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { API_BASE_URL, API_KEY } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisPipeline } from './AnalysisPipeline';
import type { AuditReport } from '../types';

import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { KnowledgeGlobe } from './3d/KnowledgeGlobe';
// Removed FastlaneCity3D and FloatingText3D as per new design

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
    <div className="flex items-center gap-2 text-xs font-mono font-medium text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
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
      const newFiles = Array.from(e.target.files).filter(file => file.name.toLowerCase().endsWith('.pdf'));
      if (newFiles.length !== e.target.files.length) {
        setErrorMessage('Only PDF files are supported right now.');
      }
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
      setCurrentStage(0);
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
          if (errorData?.detail) {
            errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
          }
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const ingestData = await ingestResponse.json();
      setIngestStats({ claims: ingestData.claims_ingested, files: ingestData.filenames.length });

      setCurrentStage(3);
      setStatusMessage('Retrieving high-signal candidate pairs...');

      const auditResponse = await fetch(`${API_BASE_URL}/audit?corpus_id=${corpusId}`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY },
        signal: abortControllerRef.current.signal
      });

      if (!auditResponse.ok) {
        let errorMsg = 'Audit failed';
        try {
          const errorData = await auditResponse.json();
          if (errorData?.detail) {
            errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
          }
        } catch (e) {}
        throw new Error(errorMsg);
      }

      setCurrentStage(5);
      setStatusMessage('Generating final report...');

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
      setCurrentStage(6);
      setStatusMessage('Complete.');
      
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

  // Framer Motion variants for staggered intro
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#0A0A0C]">
      {/* Abstract 3D Canvas Background */}
      <div className="absolute inset-0 z-0 opacity-50">
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }} gl={{ preserveDrawingBuffer: true, antialias: true }}>
          <React.Suspense fallback={null}>
            <ambientLight intensity={0.2} />
            <directionalLight position={[5, 5, 5]} intensity={0.5} />
            <pointLight position={[0, 0, 0]} intensity={1.5} color="#818CF8" />
            
            <group position={[0, -1, -5]}>
               <KnowledgeGlobe />
            </group>
            
            <EffectComposer disableNormalPass>
              <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={1.5} />
            </EffectComposer>
          </React.Suspense>
        </Canvas>
      </div>

      {/* Subtle Noise Texture */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      {/* 2D UI Overlay */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto p-8 pb-32 relative z-10"
      >
        <motion.div variants={itemVariants} className="flex flex-col mb-12 w-full items-center justify-center text-center">
          <p className="text-indigo-400 text-xs tracking-[0.3em] uppercase mb-3 font-semibold animate-pulse">
            Neural Audit Matrix
          </p>
          <h1 className="text-6xl md:text-8xl tracking-tight font-bold mt-12 -mb-6 text-indigo-100 drop-shadow-2xl py-4 leading-[1.2]" style={{ fontFamily: "'Zapfino', 'Apple Chancery', cursive", textShadow: "0 0 20px rgba(99, 102, 241, 0.4)" }}>
            Sentinel
          </h1>
          <h2 className="text-zinc-400 text-lg md:text-xl max-w-2xl font-light">
            Enterprise Knowledge Auditor. Ensure organizational policy alignment through autonomous structural analysis.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            {/* Upload Zone */}
            <div className="bg-surface/40 backdrop-blur-2xl rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-white/10 glow-ambient">
              <div className="p-8 h-full relative z-10">
                {!isUploading ? (
                  <>
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-lg font-heading font-medium text-white flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                          <Activity size={16} />
                        </span>
                        New Analysis Pipeline
                      </h2>
                      {files.length > 0 && (
                        <button onClick={handleCancel} className="p-2 text-zinc-500 hover:text-red-400 rounded-full hover:bg-red-500/10 transition-colors">
                          <X size={18} strokeWidth={2.5}/>
                        </button>
                      )}
                    </div>

                    <div 
                      className="relative border border-dashed border-white/10 rounded-xl p-12 text-center hover:border-indigo-400/50 hover:bg-indigo-400/5 transition-all duration-300 cursor-pointer group/upload focus-ring bg-black/20"
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
                      tabIndex={0}
                      role="button"
                    >
                      <input
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        ref={fileInputRef}
                      />
                      <div className="w-14 h-14 rounded-full bg-elevated border border-white/5 mx-auto flex items-center justify-center mb-5 shadow-lg group-hover/upload:scale-110 group-hover/upload:shadow-indigo-500/20 transition-all duration-300">
                        <Upload size={22} className={files.length > 0 ? "text-indigo-400" : "text-zinc-500 group-hover/upload:text-indigo-400 transition-colors duration-300"} />
                      </div>
                      <h3 className="text-base font-medium text-white mb-1">Upload knowledge documents</h3>
                      <p className="text-sm text-zinc-400">Select PDFs for cross-referencing and contradiction analysis.</p>
                    </div>

                    {files.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-6 space-y-4"
                      >
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Selected Files</h4>
                        <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {files.map((f, i) => (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              key={i} 
                              className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-md border border-white/5 rounded-xl group hover:bg-white/10 transition-colors duration-200"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center text-indigo-400 shrink-0">
                                  <File size={14} />
                                </div>
                                <span className="text-sm font-medium text-white/90 truncate">{f.name}</span>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors duration-200"
                              >
                                <X size={14} />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                        
                        <div className="pt-6 flex justify-end gap-3 border-t border-white/5 mt-6">
                          <button 
                            onClick={handleCancel}
                            className="px-4 py-2 text-sm text-zinc-400 font-medium hover:text-white rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAudit}
                            disabled={isUploading}
                            className="relative px-6 py-2 bg-indigo-500 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-300 text-sm overflow-hidden disabled:opacity-50 disabled:hover:translate-y-0"
                          >
                            <Play size={14} fill="currentColor" />
                            <span>Execute Pipeline</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full flex flex-col relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-3xl shadow-2xl"
                  >
                    {/* Header */}
                    <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-6 h-6">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500"
                          />
                          <Loader2 size={12} className="text-indigo-400" />
                        </div>
                        <h2 className="text-sm font-medium text-white/90">Enterprise Pipeline Execution</h2>
                      </div>
                      <ExecutionTimer isUploading={isUploading} />
                    </div>
                    
                    {/* Content */}
                    <div className="p-8 relative z-10">
                      {/* Status Indicator */}
                      <div className="mb-8" aria-live="polite">
                        <p className="text-[10px] text-indigo-400 font-bold mb-2 uppercase tracking-widest">
                          Current Operation
                        </p>
                        <AnimatePresence mode="wait">
                          <motion.p 
                            key={statusMessage || STAGES[currentStage]}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-xl text-white font-heading font-medium tracking-tight"
                          >
                            {statusMessage || STAGES[currentStage]}
                          </motion.p>
                        </AnimatePresence>
                      </div>

                      {/* Real Stats Box */}
                      <AnimatePresence>
                        {ingestStats && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, y: 10 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            className="overflow-hidden mb-8"
                          >
                            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 backdrop-blur-xl relative overflow-hidden">
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Docs Parsed</p>
                                  <p className="text-2xl font-heading font-medium text-white">{ingestStats.files}</p>
                                </div>
                                <div className="border-l border-r border-white/5">
                                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Claims Extracted</p>
                                  <p className="text-2xl font-heading font-medium text-white">{ingestStats.claims}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Vectorization</p>
                                  <p className="text-base font-medium text-emerald-400 flex items-center justify-center gap-1.5 h-8 mt-0.5">
                                    <CheckCircle2 size={16}/> 100%
                                  </p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="relative w-full">
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
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 backdrop-blur-xl"
                >
                  <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-400">{errorMessage}</p>
                    <p className="text-xs text-red-400/70 mt-1">Check that the backend is running and try again.</p>
                  </div>
                  <button onClick={() => setErrorMessage('')} className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/20 rounded-md transition-colors">
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recent Analyses */}
            <motion.div variants={itemVariants} className="pt-2">
              <h2 className="text-[10px] font-bold text-zinc-500 mb-4 uppercase tracking-widest pl-1">Recent Audit Reports</h2>
              <div className="grid grid-cols-1 gap-3">
                {analyses.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 bg-white/[0.02] border border-white/5 rounded-xl">
                    <BarChart3 size={20} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No analyses completed yet.</p>
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
            </motion.div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-4">
            <StatCard 
              title="Overall Health" 
              value={latestHealth.toFixed(1)} 
              subtitle={`Based on ${totalDocuments} analyzed files.`} 
              suffix="/ 100" 
              icon={<Activity size={16} className="text-emerald-400" />} 
              colorClass="success" 
            />
            <StatCard 
              title="Open Findings" 
              value={criticalFindings.toString()} 
              suffix="Critical" 
              icon={<AlertTriangle size={16} className={criticalFindings > 0 ? "text-red-400" : "text-zinc-400"} />} 
              colorClass="critical" 
            />
            <StatCard 
              title="Knowledge Base" 
              value={totalDocuments.toString()} 
              suffix="PDFs" 
              icon={<FileText size={16} className="text-indigo-400" />} 
              colorClass="accent" 
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// Sub-components

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  suffix?: string;
  icon: React.ReactNode;
  colorClass: 'success' | 'critical' | 'accent';
}

const StatCard = React.memo(({ title, value, subtitle, suffix, icon, colorClass }: StatCardProps) => {
  const glowMap = {
    success: 'shadow-[0_0_30px_-10px_rgba(52,211,153,0.15)] group-hover:shadow-[0_0_40px_-10px_rgba(52,211,153,0.25)]',
    critical: 'shadow-[0_0_30px_-10px_rgba(248,113,113,0.15)] group-hover:shadow-[0_0_40px_-10px_rgba(248,113,113,0.25)]',
    accent: 'shadow-[0_0_30px_-10px_rgba(129,140,248,0.15)] group-hover:shadow-[0_0_40px_-10px_rgba(129,140,248,0.25)]'
  };

  return (
    <div className={`bg-surface/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 ${glowMap[colorClass]}`} tabIndex={0} aria-label={`${title}: ${value}`}>
      <div className="flex items-center gap-3 text-zinc-400 mb-5 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-black/20 border border-white/5 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex items-baseline gap-2 relative z-10">
        <span className="text-4xl font-heading font-bold text-white tracking-tight">{value}</span>
        {suffix && (
          <span className="text-xs font-medium text-zinc-500">
            {suffix}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-[11px] text-zinc-500">{subtitle}</p>
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
  <div 
    onClick={onClick}
    onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    role="button"
    tabIndex={0}
    aria-label={`View analysis report for ${analysis.name || 'Knowledge Audit Run'}`}
    className="bg-surface/30 backdrop-blur-md p-4 rounded-xl border border-white/5 hover:border-indigo-500/30 hover:bg-white/5 transition-all duration-200 cursor-pointer group flex items-center justify-between"
  >
    <div>
      <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
        {analysis.name || 'Knowledge Audit Run'}
        {analysis.contradictions_found > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-bold uppercase tracking-wider">
            {analysis.contradictions_found} Risks
          </span>
        )}
      </h3>
      <p className="text-[11px] text-zinc-500 mt-1 font-mono">
        {new Date(analysis.timestamp || '').toLocaleString()} <span className="mx-1.5 opacity-30">|</span> {analysis.total_documents} docs
      </p>
    </div>
    <div className="w-8 h-8 rounded-full bg-black/20 border border-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:border-indigo-500 group-hover:text-white text-zinc-500 transition-all duration-200">
      <ArrowRight size={14} />
    </div>
  </div>
));
RecentAnalysisCard.displayName = 'RecentAnalysisCard';
