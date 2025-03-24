import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

document.title = "InvestorBase";

createRoot(document.getElementById("root")!).render(<App />);
