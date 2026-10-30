import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { useThemeStore } from './stores/theme.store.js';
import './index.css';

useThemeStore.getState().initTheme();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-sm',
          style: {
            borderRadius: '12px',
            background: '#0f172a',
            color: '#f8fafc',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#022c22' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);
