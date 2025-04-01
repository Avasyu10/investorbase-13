import { Suspense } from "react";
import { Routes } from "./routes";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BarcConfirmationEmail } from '@/components/BarConfirmationEmail';
import { RealtimeSubscriptions } from '@/components/RealtimeSubscriptions';

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
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
