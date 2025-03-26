
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

document.title = "InvestorBase";

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
} else {
  console.error("Root element not found");
}
