import { useState, useEffect } from 'react';
import { Layers, Box } from 'lucide-react';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const [themeMode, setThemeMode] = useState<'glass' | 'solid'>(() => {
    return (localStorage.getItem('themeMode') as 'glass' | 'solid') || 'glass';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
    if (themeMode === 'solid') {
      document.documentElement.classList.remove('theme-glass');
      document.documentElement.classList.add('theme-solid');
    } else {
      document.documentElement.classList.remove('theme-solid');
      document.documentElement.classList.add('theme-glass');
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'glass' ? 'solid' : 'glass'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-elevated/50 transition-colors border border-transparent hover:border-borderLight"
      title={`Switch to ${themeMode === 'glass' ? 'Solid' : 'Glass'} Mode`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: themeMode === 'glass' ? 0 : 180 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {themeMode === 'glass' ? (
          <Layers size={16} className="text-accent" />
        ) : (
          <Box size={16} className="text-secondary" />
        )}
      </motion.div>
      <span className="text-sm font-medium text-secondary hidden md:inline-block">
        {themeMode === 'glass' ? 'Glass' : 'Solid'}
      </span>
    </button>
  );
}
