import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Database, Search, Brain, Scale, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  activeStage: number;
  filename: string;
}

const STAGES = [
  { id: 'upload', label: 'Reading PDF & Extracting Claims', icon: FileText },
  { id: 'embeddings', label: 'Building Embeddings', icon: Database },
  { id: 'retrieval', label: 'Semantic Retrieval', icon: Search },
  { id: 'verification', label: 'LLM Verification', icon: Brain },
  { id: 'risk', label: 'Risk Analysis', icon: Scale },
  { id: 'finalize', label: 'Finalizing Findings', icon: ShieldCheck },
  { id: 'complete', label: 'Complete', icon: CheckCircle2 },
];

export const AnalysisPipeline: React.FC<Props> = ({ activeStage, filename }) => {


  const progressPercentage = (Math.min(activeStage, STAGES.length - 1) / (STAGES.length - 1)) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="w-full bg-surface/40 backdrop-blur-3xl border border-borderLight rounded-3xl shadow-2xl p-10 relative overflow-hidden group"
      aria-label={`Analysis Pipeline Status: ${STAGES[activeStage]?.label || 'Complete'}`}
      role="region"
    >
      
      <div className="text-center mb-12 relative z-10">
        <h3 className="text-xl font-heading font-semibold text-primary mb-2">Analysis in Progress</h3>
        <p className="text-sm text-secondary font-mono tracking-wide">Processing {filename}</p>
      </div>

      <div className="relative mx-auto max-w-lg z-10 pl-4">
        {/* Connecting Line Track */}
        <div className="absolute left-9 top-6 bottom-8 w-[2px] bg-borderLight overflow-hidden">
          <motion.div 
            className="w-full bg-accent relative"
            initial={{ height: '0%' }}
            animate={{ height: `${progressPercentage}%` }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>


        
        <div className="space-y-10 relative">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isCompleted = idx < activeStage;
            const isCurrent = idx === activeStage;

            return (
              <motion.div 
                key={stage.id} 
                className="flex items-center gap-6 group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.24 }}
              >
                <div className="relative">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 transition-colors duration-200
                      ${isCompleted ? 'bg-primary text-background' : 
                        isCurrent ? 'bg-background border-2 border-accent text-accent' :
                        'bg-elevated border border-borderLight text-tertiary'
                      }
                    `}
                  >
                    {isCompleted && stage.id !== 'complete' ? (
                      <CheckCircle2 size={18} strokeWidth={2.5} />
                    ) : isCurrent && stage.id !== 'complete' ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Icon size={18} strokeWidth={1.5} />
                    )}
                  </div>
                </div>
                
                <div className="flex-1 pt-1">
                  <div className="flex flex-col">
                    <span className={`text-sm transition-colors duration-200 ${
                      isCurrent ? 'text-primary font-semibold' : 
                      isCompleted ? 'text-primary' : 
                      'text-tertiary'
                    }`}>
                      {stage.label}
                    </span>
                    
                    {isCurrent && stage.id !== 'complete' && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-secondary font-mono uppercase tracking-wider">Processing</span>
                        <span className="flex space-x-1">
                          <span className="w-1 h-1 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
