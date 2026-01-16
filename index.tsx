import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// تسجيل الـ Service Worker لدعم العمل بدون إنترنت والإشعارات
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // تم تغيير المسار من '/service-worker.js' إلى 'service-worker.js' 
    // لضمان تحميله من نفس النطاق (Origin) الذي يعمل عليه التطبيق حالياً
    navigator.serviceWorker.register('service-worker.js')
      .then((registration) => {
        console.log('Kimo SW registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('Kimo SW registration failed:', error);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);