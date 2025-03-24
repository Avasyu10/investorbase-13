import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Set the document title
document.title = "InvestorBase";

// Optionally we could also update favicon dynamically here
// But we'll keep the existing favicon as the app logo

createRoot(document.getElementById("root")!).render(<App />);
