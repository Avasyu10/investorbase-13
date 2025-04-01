
import { Suspense } from "react";
import { routes } from "./lib/routes";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BarcConfirmationEmail } from '@/components/BarConfirmationEmail';
import { RealtimeSubscriptions } from '@/components/RealtimeSubscriptions';
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const queryClient = new QueryClient();

// Create router from routes
const router = createBrowserRouter(routes);

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster />
        <RealtimeSubscriptions />
        <BarcConfirmationEmail />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
