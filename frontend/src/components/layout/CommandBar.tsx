import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Menu, FileText, Settings, ShieldCheck, Sparkles } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { AuditReport } from '../../types';
import { ThemeToggle } from '../ThemeToggle';

export function CommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { analyses } = useWorkspace();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
    }
  }, [isOpen]);

  const filteredAnalyses = analyses.filter((a: AuditReport) => {
    const q = query.toLowerCase();
    const name = a.name || `Analysis Run`;
    return name.toLowerCase().includes(q) || a.audit_id.toLowerCase().includes(q);
  });

  const handleSelect = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <>
      <motion.header 
        className="h-16 px-6 flex items-center justify-between sticky top-0 z-20 glass glass--refractive rounded-none border-x-0 border-t-0 border-b border-borderLight/50"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-4 flex-1">
          <button className="md:hidden text-secondary hover:text-primary transition-colors">
            <Menu size={18} />
          </button>
          
          <motion.button 
            onClick={() => setIsOpen(true)}
            className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-elevated/50 hover:bg-elevated border border-borderLight rounded-md text-sm text-tertiary hover:text-secondary transition-all w-64 group relative overflow-hidden"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {/* Shimmer effect on search bar */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 6, ease: 'easeInOut' }}
            />
            <Search size={14} className="group-hover:text-primary transition-colors relative z-10" />
            <span className="flex-1 text-left relative z-10">Search everything...</span>
            <span className="text-[10px] font-mono border border-borderLight px-1.5 py-0.5 rounded bg-background relative z-10">⌘K</span>
          </motion.button>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-8 h-8 rounded-full bg-elevated border border-borderLight flex items-center justify-center relative cursor-pointer hover:border-accent transition-colors"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell size={16} className="text-secondary" />
            <AnimatePresence>
              {analyses.length > 0 && (
                <motion.span 
                  className="absolute top-0 right-0 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 15 }}
                />
              )}
            </AnimatePresence>
          </motion.div>
          
          <ThemeToggle />

          <motion.div 
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-white font-medium text-xs shadow-glow-accent cursor-pointer"
            whileHover={{ scale: 1.08, boxShadow: '0 0 25px rgba(99,102,241,0.5)' }}
            whileTap={{ scale: 0.95 }}
          >
            US
          </motion.div>
        </div>
      </motion.header>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, y: -15, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full max-w-2xl glass glass--refractive overflow-hidden"
            >
              {/* Animated gradient border */}
              <motion.div 
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  padding: '1px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.3), transparent, rgba(139,92,246,0.2))',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  borderRadius: 'inherit',
                }}
                animate={{
                  background: [
                    'linear-gradient(135deg, rgba(99,102,241,0.3), transparent, rgba(139,92,246,0.2))',
                    'linear-gradient(225deg, rgba(99,102,241,0.2), transparent, rgba(59,130,246,0.3))',
                    'linear-gradient(315deg, rgba(139,92,246,0.3), transparent, rgba(99,102,241,0.2))',
                    'linear-gradient(135deg, rgba(99,102,241,0.3), transparent, rgba(139,92,246,0.2))',
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
              
              <div className="flex items-center px-4 py-3 border-b border-borderLight relative z-10">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Sparkles size={18} className="text-accent mr-3" />
                </motion.div>
                <input 
                  ref={inputRef}
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search analyses, documents, settings..."
                  className="flex-1 bg-transparent border-none text-primary focus:outline-none focus:ring-0 placeholder:text-tertiary text-base"
                />
                <motion.button 
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-mono text-tertiary bg-elevated px-2 py-1 rounded border border-borderLight hover:text-primary transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ESC
                </motion.button>
              </div>

              <motion.div 
                className="max-h-[60vh] overflow-y-auto p-2 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                {query === '' && (
                  <motion.div 
                    className="px-3 py-2 text-xs font-semibold text-tertiary uppercase tracking-wider mt-2 mb-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Quick Actions
                  </motion.div>
                )}
                
                {query === '' && (
                  <div className="space-y-1">
                    {[
                      { path: '/', icon: ShieldCheck, label: 'New Analysis', desc: 'Upload documents and start a scan', iconBg: 'bg-accent/10 border-accent/20 text-accent' },
                      { path: '/settings', icon: Settings, label: 'Settings', desc: 'Manage workspace configuration', iconBg: 'bg-elevated border-borderLight text-secondary group-hover:text-primary' },
                    ].map((action, idx) => (
                      <motion.button 
                        key={action.path}
                        onClick={() => handleSelect(action.path)} 
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-elevated transition-colors group text-left relative overflow-hidden"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + idx * 0.05 }}
                        whileHover={{ x: 4 }}
                      >
                        <motion.div 
                          className={`w-8 h-8 rounded border flex items-center justify-center ${action.iconBg} transition-colors`}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          <action.icon size={16} />
                        </motion.div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-primary">{action.label}</div>
                          <div className="text-xs text-secondary">{action.desc}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {filteredAnalyses.length > 0 && (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <div className="px-3 py-2 mt-4 mb-1 text-xs font-semibold text-tertiary uppercase tracking-wider">
                        Recent Analyses
                      </div>
                      <div className="space-y-1">
                        {filteredAnalyses.slice(0, 5).map((a: AuditReport, idx) => (
                          <motion.button 
                            key={a.audit_id}
                            onClick={() => handleSelect(`/analyses/${a.audit_id}`)} 
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-elevated transition-colors group text-left"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            whileHover={{ x: 4 }}
                          >
                            <motion.div 
                              className="w-8 h-8 rounded bg-elevated border border-borderLight flex items-center justify-center text-secondary group-hover:text-primary transition-colors"
                              whileHover={{ scale: 1.1 }}
                            >
                              <FileText size={16} />
                            </motion.div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-primary">{a.name || 'Analysis Run'}</div>
                              <div className="text-xs text-secondary">ID: {a.audit_id.substring(0, 8)} • {a.contradictions_found} conflicts</div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <AnimatePresence mode="wait">
                  {query !== '' && filteredAnalyses.length === 0 && (
                    <motion.div 
                      key="empty"
                      className="py-10 text-center"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Search size={24} className="mx-auto text-tertiary mb-3" />
                      </motion.div>
                      <p className="text-sm text-secondary">No results found for "{query}"</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
