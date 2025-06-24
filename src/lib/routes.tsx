
import { createBrowserRouter } from "react-router-dom"

import Dashboard from "@/pages/Dashboard"
import Profile from "@/pages/Profile"
import Report from "@/pages/Report"
import PublicUpload from "@/pages/PublicUpload"
import EurekaSample from "@/pages/EurekaSample"
import ThankYou from "@/pages/ThankYou"
import EurekaEmbed from "@/pages/EurekaEmbed";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
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
    path: "/profile",
    element: <Profile />,
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
    path: "/eureka/:slug",
    element: <EurekaSample />,
  },
  {
    path: "/thank-you",
    element: <ThankYou />,
  },
  {
    path: "/eureka/embed/:slug",
    element: <EurekaEmbed />,
  },
]);
