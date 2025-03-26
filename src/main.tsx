
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

document.title = "InvestorBase";

const container = document.getElementById('root');

// Make sure container exists before creating root
if (!container) {
  throw new Error('Root element not found. Make sure there is a div with id "root" in your HTML.');
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
