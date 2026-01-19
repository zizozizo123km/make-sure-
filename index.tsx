
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// تسجيل الـ Service Worker بطريقة مبسطة لتفادي أخطاء المسارات
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // استخدام مسار مباشر يضمن التوافق مع جميع البيئات
    navigator.serviceWorker.register('service-worker.js')
      .then((reg) => console.log('Kimo SW Active:', reg.scope))
      .catch((err) => console.warn('SW Status:', err.message));
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
