import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => console.log('SW Active:', reg.scope))
      .catch((err) => console.warn('SW Error:', err.message));
  });
}

const root = createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
