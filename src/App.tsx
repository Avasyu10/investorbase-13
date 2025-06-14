
import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import { RealtimeSubscriptions } from '@/components/RealtimeSubscriptions';
import { RealtimeEmailListener } from '@/components/RealtimeEmailListener';
import { BrowserRouter, useRoutes, useLocation } from 'react-router-dom';
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

// Component to conditionally render Navbar and padding
const ConditionalLayout = () => {
  const location = useLocation();
  
  // Don't show navbar on thank you page
  const showNavbar = location.pathname !== '/thank-you';
  
  return (
    <>
      {showNavbar && <Navbar />}
      <div className={showNavbar ? "pt-16" : ""}>
        <AppRoutes />
      </div>
    </>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <RealtimeSubscriptions />
          <RealtimeEmailListener />
          <ConditionalLayout />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
