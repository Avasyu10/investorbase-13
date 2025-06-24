import { createBrowserRouter } from "react-router-dom"

import Dashboard from "@/pages/Dashboard"
import Home from "@/pages/Home"
import Login from "@/pages/Login"
import Profile from "@/pages/Profile"
import Report from "@/pages/Report"
import Reports from "@/pages/Reports"
import Settings from "@/pages/Settings"
import SignUp from "@/pages/SignUp"
import PublicUpload from "@/pages/PublicUpload"
import PublicForm from "@/pages/PublicForm"
import EurekaSample from "@/pages/EurekaSample"
import ThankYou from "@/pages/ThankYou"
import Pricing from "@/pages/Pricing"
import BarcForm from "@/pages/BarcForm"
import EurekaEmbed from "@/pages/EurekaEmbed";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/reports",
    element: <Reports />,
  },
  {
    path: "/report/:reportId",
    element: <Report />,
  },
  {
    path: "/reports/:id",
    element: <Report />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <SignUp />,
  },
  {
    path: "/profile",
    element: <Profile />,
  },
  {
    path: "/settings",
    element: <Settings />,
  },
  {
    path: "/public-upload",
    element: <PublicUpload />,
  },
  {
    path: "/public-upload/:formSlug",
    element: <PublicUpload />,
  },
  {
    path: "/public-form/:formSlug",
    element: <PublicForm />,
  },
  {
    path: "/eureka/:slug",
    element: <EurekaSample />,
  },
   {
    path: "/barc/:slug",
    element: <BarcForm />,
  },
  {
    path: "/thank-you",
    element: <ThankYou />,
  },
  {
    path: "/pricing",
    element: <Pricing />,
  },
  {
    path: "/eureka/embed/:slug",
    element: <EurekaEmbed />,
  },
]);
