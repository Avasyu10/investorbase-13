
import { createBrowserRouter } from "react-router-dom";
import App from "@/App";
import Dashboard from "@/pages/Dashboard";
import EurekaIframe from "@/pages/EurekaIframe";
import EurekaSample from "@/pages/EurekaSample";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import ThankYou from "@/pages/ThankYou";
import Index from "@/pages/Index";
import ResetPassword from "@/pages/ResetPassword";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Index />,
      },
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/profile",
        element: <Profile />,
      },
      {
        path: "/thank-you",
        element: <ThankYou />,
      },
      {
        path: "/eureka-sample/:slug?",
        element: <EurekaSample />,
      },
      {
        path: "/reset-password",
        element: <ResetPassword />,
      },
      {
        path: "/eureka-iframe/:slug?",
        element: <EurekaIframe />,
      },
    ],
  },
]);
