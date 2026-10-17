import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global Fetch Interceptor: injects Bearer token & credentials for seamless Vercel <-> Render API communication
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const options: RequestInit = { ...(init || {}) };
  const headers = new Headers(options.headers || {});
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  options.headers = headers;
  if (!options.credentials) {
    options.credentials = 'include';
  }

  return originalFetch(input, options);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
