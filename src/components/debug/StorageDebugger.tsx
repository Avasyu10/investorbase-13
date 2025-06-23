
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { debugStorageBucket } from "@/lib/supabase/reports";

export function StorageDebugger() {
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<string>('');

  const handleDebug = async () => {
    setIsDebugging(true);
    setDebugResults('Running debug...');
    
    try {
      // Capture console logs
      const originalLog = console.log;
      const originalError = console.error;
      let logs: string[] = [];
      
      console.log = (...args) => {
        logs.push(`LOG: ${args.join(' ')}`);
        originalLog(...args);
      };
      
      console.error = (...args) => {
        logs.push(`ERROR: ${args.join(' ')}`);
        originalError(...args);
      };
      
      await debugStorageBucket();
      
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      
      setDebugResults(logs.join('\n'));
    } catch (error) {
      setDebugResults(`Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDebugging(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Storage Bucket Debugger</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleDebug} 
          disabled={isDebugging}
          className="mb-4"
        >
          {isDebugging ? 'Debugging...' : 'Debug Storage Bucket'}
        </Button>
        
        {debugResults && (
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {debugResults}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
