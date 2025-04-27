import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormState } from './formReducer';

// Log entry interface
export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error';
  details?: any;
}

interface DebugPanelProps {
  formState: FormState;
  logs: LogEntry[];
  onClose: () => void;
}

// Format date for display in logs
const formatDate = (date: Date) => {
  return date.toLocaleTimeString();
};

export const DebugPanel: React.FC<DebugPanelProps> = ({ formState, logs, onClose }) => {
  if (process.env.NODE_ENV === 'production') return null;
  
  return (
    <Card className="max-w-4xl mx-auto mt-4">
      <CardHeader>
        <CardTitle>Debug Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="state">
          <TabsList>
            <TabsTrigger value="state">Form State</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="state">
            <div className="bg-muted p-4 rounded-md overflow-auto max-h-96">
              <pre className="text-xs">{JSON.stringify(formState, null, 2)}</pre>
            </div>
          </TabsContent>
          <TabsContent value="logs">
            <div className="bg-muted p-4 rounded-md overflow-auto max-h-96">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">No logs yet.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="text-xs">
                      <span className={`font-mono ${
                        log.type === 'success' 
                          ? 'text-green-600' 
                          : log.type === 'error' 
                            ? 'text-red-600' 
                            : 'text-blue-600'
                      }`}>
                        [{formatDate(log.timestamp)}] {log.message}
                      </span>
                      {log.details && (
                        <pre className="mt-1 ml-4 text-xs text-muted-foreground">
                          {typeof log.details === 'string' 
                            ? log.details 
                            : JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
