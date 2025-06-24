
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/lib/routes'
import './index.css'

document.title = "InvestorBase";

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
