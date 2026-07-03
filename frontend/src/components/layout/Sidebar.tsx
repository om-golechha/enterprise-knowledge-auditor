import { Home, FileText, ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientOrb } from '../AnimatedPrimitives';

export function Sidebar() {
  
  const navItems = [
    { icon: Home, label: 'Workspace', path: '/' },
    { icon: FileText, label: 'Analyses', path: '/analyses' },
  ];

  return (
    <aside className="w-[260px] border-r border-borderLight glass flex flex-col h-screen flex-shrink-0 z-10 transition-all relative overflow-hidden">
      {/* Ambient background orb */}
      <GradientOrb 
        size={200} 
        color1="rgba(99, 102, 241, 0.06)" 
        color2="rgba(139, 92, 246, 0.03)"
        className="-top-20 -right-20"
      />
      
      {/* Logo with entrance animation */}
      <motion.div 
        className="h-16 flex items-center px-6 border-b border-borderLight/50 mb-6 relative z-10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div 
          className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center mr-3 border border-accent/30 shadow-[0_0_15px_rgba(79,70,229,0.2)] relative overflow-hidden"
          whileHover={{ 
            scale: 1.1, 
            boxShadow: '0 0 25px rgba(99,102,241,0.4)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {/* Shimmer sweep on logo */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
          />
          <ShieldCheck className="w-4 h-4 text-accent relative z-10" strokeWidth={2.5} />
        </motion.div>
        <motion.span 
          className="font-heading font-semibold tracking-wide text-[15px] text-primary"
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Auditor
        </motion.span>
      </motion.div>
      
      <motion.div 
        className="px-4 mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="text-[11px] font-semibold text-tertiary uppercase tracking-wider ml-2">Menu</span>
      </motion.div>
      
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              delay: 0.3 + idx * 0.1,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <NavLink
              to={item.path}
              className={({ isActive }) => twMerge(
                clsx(
                  "w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group relative overflow-hidden",
                  isActive 
                    ? "bg-elevated text-primary font-medium shadow-card border border-borderLight/50" 
                    : "text-secondary hover:bg-elevatedHover/50 hover:text-primary border border-transparent"
                )
              )}
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar with spring animation */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div 
                        className="absolute left-0 top-1/2 w-1 bg-accent rounded-r-full"
                        initial={{ height: 0, y: '-50%' }}
                        animate={{ height: 16, y: '-50%' }}
                        exit={{ height: 0, y: '-50%' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </AnimatePresence>
                  
                  {/* Active background glow */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-lg bg-accent/5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </AnimatePresence>
                  
                  <motion.div
                    className="relative z-10 flex items-center"
                    whileHover={{ x: 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <item.icon 
                      className={clsx(
                        "w-[18px] h-[18px] mr-3 transition-colors", 
                        isActive ? "text-accent" : "text-tertiary group-hover:text-secondary"
                      )} 
                      strokeWidth={isActive ? 2 : 1.5} 
                    />
                    {item.label}
                  </motion.div>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>
      
      {/* Bottom ambient decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-accent/[0.02] to-transparent pointer-events-none" />
    </aside>
  );
}
