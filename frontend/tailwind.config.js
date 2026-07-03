/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        elevatedHover: 'rgb(var(--elevated-hover) / <alpha-value>)',
        borderLight: 'rgba(var(--border-light))',
        borderStrong: 'rgba(var(--border-strong))',
        
        primary: 'rgb(var(--text-primary) / <alpha-value>)',
        secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
        tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
        
        accent: 'rgb(var(--accent) / <alpha-value>)',
        accentHover: 'rgb(var(--accent-hover) / <alpha-value>)',
        accentBg: 'rgba(var(--accent-bg))',
        
        success: 'rgb(var(--success) / <alpha-value>)',
        successBg: 'rgba(var(--success-bg))',
        
        warning: 'rgb(var(--warning) / <alpha-value>)',
        warningBg: 'rgba(var(--warning-bg))',
        
        critical: 'rgb(var(--critical) / <alpha-value>)',
        criticalBg: 'rgba(var(--critical-bg))',

        'risk-low': 'rgb(var(--success) / <alpha-value>)',
        'risk-medium': 'rgb(var(--warning) / <alpha-value>)',
        'risk-high': 'rgb(var(--critical) / <alpha-value>)',
        'risk-critical': 'rgb(var(--critical) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Cabinet Grotesk', 'Satoshi', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        'elevated': '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        'glow-accent': '0 0 20px -5px rgba(var(--accent) / 0.5), 0 0 40px -10px rgba(var(--accent) / 0.3)',
        'inset-border': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.02)' },
        },
        'aurora': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'border-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '200% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 2.5s linear infinite',
        'float': 'float 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'aurora': 'aurora 8s ease infinite',
        'border-flow': 'border-flow 4s ease infinite',
      },
    },
  },
  plugins: [],
}
