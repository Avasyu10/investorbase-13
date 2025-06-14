
import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import { RealtimeSubscriptions } from '@/components/RealtimeSubscriptions';
import { RealtimeEmailListener } from '@/components/RealtimeEmailListener';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { routes } from '@/lib/routes';

// Create a client
const queryClient = new QueryClient();

// Routes component that uses the routes configuration
const AppRoutes = () => {
  return useRoutes(routes);
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <RealtimeSubscriptions />
          <RealtimeEmailListener />
          <Navbar />
          <div className="pt-16">
            <AppRoutes />
          </div>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
