import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const themeMode = localStorage.getItem('themeMode') || 'glass';
if (themeMode === 'solid') {
  document.documentElement.classList.add('theme-solid');
} else {
  document.documentElement.classList.add('theme-glass');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
