import { createBrowserRouter } from "react-router-dom";
import App from "@/App";
import ComingSoon from "@/pages/ComingSoon";
import ComponentCatalog from "@/pages/ComponentCatalog";
import Dashboard from "@/pages/Dashboard";
import DealPage from "@/pages/DealPage";
import Deals from "@/pages/Deals";
import Discover from "@/pages/Discover";
import EurekaSample from "@/pages/EurekaSample";
import NotFound from "@/pages/NotFound";
import Notifications from "@/pages/Notifications";
import Onboarding from "@/pages/Onboarding";
import Pricing from "@/pages/Pricing";
import Profile from "@/pages/Profile";
import PublicProfile from "@/pages/PublicProfile";
import Sandbox from "@/pages/Sandbox";
import Search from "@/pages/Search";
import Settings from "@/pages/Settings";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import ThankYou from "@/pages/ThankYou";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import ScrollToTop from "@/components/utils/ScrollToTop";
import EurekaIframe from "@/pages/EurekaIframe";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ScrollToTop>
        <App />
      </ScrollToTop>
    ),
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "/discover",
        element: <Discover />,
      },
      {
        path: "/search",
        element: <Search />,
      },
      {
        path: "/notifications",
        element: <Notifications />,
      },
      {
        path: "/profile",
        element: <Profile />,
      },
      {
        path: "/profile/:id",
        element: <PublicProfile />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
      {
        path: "/deals",
        element: <Deals />,
      },
      {
        path: "/deals/:id",
        element: <DealPage />,
      },
      {
        path: "/component-catalog",
        element: <ComponentCatalog />,
      },
      {
        path: "/sandbox",
        element: <Sandbox />,
      },
      {
        path: "/onboarding",
        element: <Onboarding />,
      },
      {
        path: "/pricing",
        element: <Pricing />,
      },
      {
        path: "/coming-soon",
        element: <ComingSoon />,
      },
      {
        path: "/thank-you",
        element: <ThankYou />,
      },
      {
        path: "/terms",
        element: <Terms />,
      },
      {
        path: "/privacy",
        element: <Privacy />,
      },
      {
        path: "/eureka-sample/:slug?",
        element: <EurekaSample />,
      },
    ],
  },
  {
    path: "/sign-in",
    element: <SignIn />,
  },
  {
    path: "/sign-up",
    element: <SignUp />,
  },
  {
    path: "/eureka-iframe/:slug?",
    element: <EurekaIframe />,
  },
]);
