
import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import { RealtimeSubscriptions } from '@/components/RealtimeSubscriptions';

function App() {
  return (
    <div>
      <RealtimeSubscriptions />
      <Toaster />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-4">Welcome to the dashboard.</p>
      </div>
    </div>
  );
}

export default App;
