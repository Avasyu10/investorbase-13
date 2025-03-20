
import { ElementType } from "react";
import { Home, BarChartBig, Upload, User } from "lucide-react";

export type RouteConfig = {
  path: string;
  label: string;
  icon?: ElementType;
  requiresAuth?: boolean;
  hideFromNav?: boolean;
  publicOnly?: boolean;
};

export const routes: RouteConfig[] = [
  {
    path: "/",
    label: "Home",
    icon: Home,
  },
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: BarChartBig,
    requiresAuth: true,
  },
  {
    path: "/upload",
    label: "Upload",
    icon: Upload,
    requiresAuth: true,
  },
  {
    path: "/public-upload",
    label: "Submit Pitch Deck",
    icon: Upload,
    requiresAuth: false,
  },
  {
    path: "/profile",
    label: "Profile",
    icon: User,
    requiresAuth: true,
  },
  {
    path: "/login",
    label: "Login",
    publicOnly: true,
    hideFromNav: true,
  },
  {
    path: "/signup",
    label: "Signup",
    publicOnly: true,
    hideFromNav: true,
  },
];
