import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Database, Search, Brain, Scale, ShieldCheck, CheckCircle2, Sparkles, Activity } from 'lucide-react';

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
  const [particles, setParticles] = useState<{ id: number, delay: number, left: number }[]>([]);

  useEffect(() => {
    // Generate random particles for data flow effect
    const newParticles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 2,
      left: 19 + Math.random() * 8, // cluster around the line (left: 23px)
    }));
    setParticles(newParticles);
  }, [activeStage]);

  const progressPercentage = (Math.min(activeStage, STAGES.length - 1) / (STAGES.length - 1)) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-surface/40 backdrop-blur-3xl border border-borderLight rounded-3xl shadow-2xl p-10 relative overflow-hidden group"
    >
      {/* 2D Scanning Laser effect across the component */}
      <motion.div 
        className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent z-50 opacity-50"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      <motion.div 
        className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-accent/5 to-transparent z-40 pointer-events-none"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      {/* Advanced Animated Background Gradients */}
      <motion.div
        className="absolute -top-40 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen"
        animate={{ 
          scale: [1, 1.2, 0.9, 1],
          opacity: [0.3, 0.6, 0.2, 0.3],
          rotate: [0, 90, 180, 360]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      
      <div className="text-center mb-12 relative z-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/30 rounded-full text-accent text-xs font-bold uppercase tracking-[0.2em] mb-4 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
        >
          <Activity size={14} className="animate-pulse" />
          <span>Neural Engine Active</span>
        </motion.div>
        <h3 className="text-3xl font-heading font-semibold text-white mb-2 tracking-tight">Pipeline Execution</h3>
        <p className="text-sm text-secondary font-mono tracking-wide">{filename}</p>
      </div>

      <div className="relative mx-auto max-w-lg z-10 pl-4">
        {/* Animated Connecting Line Track */}
        <div className="absolute left-[39px] top-6 bottom-8 w-1 bg-elevated rounded-full overflow-hidden border border-borderLight/30 shadow-inner">
          <motion.div 
            className="w-full bg-gradient-to-b from-indigo-400 via-purple-500 to-accent relative"
            initial={{ height: '0%' }}
            animate={{ height: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Plasma pulse on the line */}
            <motion.div 
              className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent via-white to-transparent opacity-60"
              animate={{ top: ['-20%', '120%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>

        {/* Data flow particles */}
        <div className="absolute left-0 top-6 bottom-8 w-20 pointer-events-none overflow-hidden">
          {particles.map(p => (
            <motion.div
              key={p.id}
              className="absolute w-1 h-3 bg-accent/60 rounded-full blur-[1px]"
              style={{ left: p.left }}
              initial={{ top: '-10%', opacity: 0 }}
              animate={{ 
                top: `${progressPercentage}%`, 
                opacity: [0, 1, 1, 0] 
              }}
              transition={{ 
                duration: 1.5 + Math.random(), 
                repeat: Infinity, 
                delay: p.delay,
                ease: "linear"
              }}
            />
          ))}
        </div>
        
        <div className="space-y-10 relative">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isCompleted = idx < activeStage;
            const isCurrent = idx === activeStage;
            const isPending = idx > activeStage;

            return (
              <motion.div 
                key={stage.id} 
                className="flex items-center gap-6 group"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.15, duration: 0.6, type: 'spring', bounce: 0.4 }}
              >
                <div className="relative">
                  {/* Outer glowing halo for active stage */}
                  <AnimatePresence>
                    {isCurrent && stage.id !== 'complete' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        className="absolute -inset-4 bg-accent/20 rounded-full blur-xl z-0"
                        transition={{ duration: 0.5 }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Pulsing ring */}
                  {isCurrent && stage.id !== 'complete' && (
                    <motion.div 
                      className="absolute inset-0 border-2 border-accent rounded-full z-0"
                      animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                  
                  <motion.div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center relative z-10 transition-all duration-500
                      ${isCompleted ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.6)] border border-white/20' : 
                        isCurrent ? 'bg-surface border-2 border-accent text-accent shadow-[0_0_30px_rgba(139,92,246,0.4)]' :
                        'bg-elevated border border-borderLight text-tertiary group-hover:border-accent/30 group-hover:text-secondary'
                      }
                    `}
                    layout
                    whileHover={isPending ? { scale: 1.05 } : {}}
                    animate={isCurrent ? { 
                      y: [0, -4, 0],
                      boxShadow: ['0 0 20px rgba(139,92,246,0.2)', '0 0 40px rgba(139,92,246,0.6)', '0 0 20px rgba(139,92,246,0.2)']
                    } : { y: 0 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      transformStyle: "preserve-3d",
                      perspective: "1000px"
                    }}
                  >
                    {isCompleted && stage.id !== 'complete' ? (
                      <motion.div 
                        initial={{ scale: 0, rotate: -180 }} 
                        animate={{ scale: 1, rotate: 0 }} 
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      >
                        <CheckCircle2 size={24} strokeWidth={2.5} />
                      </motion.div>
                    ) : isCurrent && stage.id !== 'complete' ? (
                      <motion.div
                        animate={{ rotateY: [0, 360] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles size={24} className="text-accent" />
                      </motion.div>
                    ) : (
                      <Icon size={22} strokeWidth={1.5} className={isCompleted ? 'text-white' : ''} />
                    )}
                  </motion.div>
                </div>
                
                <div className="flex-1 pt-1">
                  <motion.div 
                    animate={{ 
                      opacity: isPending ? 0.3 : 1, 
                      x: isCurrent ? 8 : 0,
                      scale: isCurrent ? 1.02 : 1
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="flex flex-col"
                  >
                    <span className={`text-lg transition-all duration-300 ${
                      isCurrent ? 'text-white font-bold tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 
                      isCompleted ? 'text-gray-200 font-semibold' : 
                      'text-muted font-medium'
                    }`}>
                      {stage.label}
                    </span>
                    
                    <AnimatePresence>
                      {isCurrent && stage.id !== 'complete' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0, filter: 'blur(5px)' }}
                          animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                          exit={{ opacity: 0, height: 0, filter: 'blur(5px)' }}
                          className="flex items-center gap-3 mt-2 overflow-hidden"
                        >
                          <span className="text-xs text-accent font-mono tracking-[0.2em] uppercase font-bold">Processing Data</span>
                          <div className="flex gap-1.5 items-center">
                            {[0, 1, 2, 3].map((dot) => (
                              <motion.div 
                                key={dot}
                                className="w-1.5 h-1.5 bg-accent rounded-full"
                                animate={{ 
                                  scale: [1, 1.8, 1], 
                                  opacity: [0.3, 1, 0.3],
                                  boxShadow: ['0 0 0 rgba(99,102,241,0)', '0 0 10px rgba(99,102,241,0.8)', '0 0 0 rgba(99,102,241,0)']
                                }}
                                transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15 }}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
