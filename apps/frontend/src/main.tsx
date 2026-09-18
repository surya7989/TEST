import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'

// Handle stale chunk hashes when a new deployment is published
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Preload error detected, reloading page for latest assets...', event);
  window.location.reload();
});

window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  ) {
    console.warn('[SPA] Dynamic import failure detected, reloading to fetch latest version...');
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,)