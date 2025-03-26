
import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import { RealtimeSubscriptions } from '@/components/RealtimeSubscriptions';
import { Navbar } from '@/components/layout/Navbar';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Dashboard from '@/pages/Dashboard';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';

function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <RealtimeSubscriptions />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
}

export default App;
