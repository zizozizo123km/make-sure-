
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// تسجيل الـ Service Worker بطريقة آمنة لتجنب أخطاء Origin Mismatch
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // استخدام URL مطلق لضمان أن المسار يتبع النطاق الحالي للتطبيق
    const swPath = new URL('./service-worker.js', window.location.href).href;
    
    navigator.serviceWorker.register(swPath)
      .then((registration) => {
        console.log('Kimo SW registered successfully:', registration.scope);
      })
      .catch((error) => {
        // سجل الخطأ في وحدة التحكم فقط دون تعطيل التطبيق
        console.warn('Service Worker registration skipped or failed:', error.message);
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
