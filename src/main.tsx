import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './theme.css';
import { Buffer } from 'buffer';

// Polyfills for Solana Web3.js
(window as any).Buffer = Buffer;
(window as any).global = window;
(window as any).process = { env: {} };

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
