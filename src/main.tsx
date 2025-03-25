
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

document.title = "InvestorBase";

// Override any inline branding that might be added by the platform
window.addEventListener('DOMContentLoaded', () => {
  // Remove any potential branding elements that might be injected
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const element = node as Element;
            // Look for potential branding elements by class or ID
            if (element.classList.contains('lovable-branding') || 
                element.id === 'lovable-branding' ||
                element.querySelector('[class*="lovable"]')) {
              element.remove();
            }
          }
        });
      }
    });
  });

  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });
});

createRoot(document.getElementById("root")!).render(<App />);
