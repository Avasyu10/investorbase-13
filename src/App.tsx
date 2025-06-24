
import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import { RealtimeSubscriptions } from '@/components/RealtimeSubscriptions';
import { RealtimeEmailListener } from '@/components/RealtimeEmailListener';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { useLocation } from 'react-router-dom';

// Create a client
const queryClient = new QueryClient();

// Component to conditionally render Navbar and padding
const ConditionalLayout = () => {
  const location = useLocation();
  
  // Don't show navbar on thank you page, public submission pages, iframe routes, or any public upload pages
  const hideNavbarPaths = ['/thank-you', '/submit', '/public-upload', '/eureka-iframe'];
  const showNavbar = !hideNavbarPaths.some(path => location.pathname.startsWith(path));
  
  return (
    <>
      {showNavbar && <Navbar />}
      <div className={showNavbar ? "pt-16" : ""}>
        <Outlet />
      </div>
    </>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeSubscriptions />
        <RealtimeEmailListener />
        <ConditionalLayout />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
