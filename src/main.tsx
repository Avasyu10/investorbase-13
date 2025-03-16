
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import AppRouterWrapper from "./AppRouterWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <AppRouterWrapper />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
