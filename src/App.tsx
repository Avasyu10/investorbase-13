
import { Suspense } from "react";
import { routes } from "@/lib/routes";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BarcConfirmationEmail } from '@/components/BarConfirmationEmail';
import { RealtimeSubscriptions } from '@/components/RealtimeSubscriptions';
import { Routes } from "react-router-dom";
import { Route } from "react-router-dom";

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={route.element}
              />
            ))}
          </Routes>
        </Suspense>
        <Toaster />
        <RealtimeSubscriptions />
        <BarcConfirmationEmail />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
