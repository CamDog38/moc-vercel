import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface EnvCheckResponse {
  emailConfig: {
    status: string;
    message: string;
  };
  authConfig: {
    status: string;
    message: string;
  };
  dbConfig: {
    status: string;
    message: string;
  };
  environment: {
    nodeEnv: string;
    coDevEnv: string;
    dynamicBaseUrl: string;
    configuredBaseUrl: string;
  };
  variables: Record<string, {
    exists: boolean;
    value?: string;
    status: string;
  }>;
  timestamp: string;
}

export default function EnvironmentPage() {
  const { user } = useAuth();
  const [envData, setEnvData] = useState<EnvCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchEnvData() {
    try {
      setLoading(true);
      const response = await fetch('/api/debug/env-check');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch environment data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setEnvData(data);
    } catch (err) {
      console.error('Error fetching environment data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch environment data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEnvData();
  }, []);

  const refreshData = () => {
    fetchEnvData();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Environment Settings</h1>
          <p className="text-muted-foreground">Check and manage your environment configuration</p>
        </div>
        <Button onClick={refreshData}>
          Refresh Data
        </Button>
      </div>

      {envData && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Environment</CardTitle>
              <CardDescription>
                Information about the current runtime environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Node Environment:</span>
                    <Badge variant={envData.environment.nodeEnv === 'production' ? 'default' : 'outline'}>
                      {envData.environment.nodeEnv}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Co.dev Environment:</span>
                    <Badge variant={envData.environment.coDevEnv === 'preview' ? 'secondary' : 'default'}>
                      {envData.environment.coDevEnv}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Dynamic Base URL:</span>
                    <div className="mt-1 p-2 bg-gray-100 rounded text-sm break-all">
                      {envData.environment.dynamicBaseUrl}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Configured Base URL:</span>
                    <div className="mt-1 p-2 bg-gray-100 rounded text-sm break-all">
                      {envData.environment.configuredBaseUrl}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuration Status</CardTitle>
              <CardDescription>
                Status of various configuration categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded border ${getStatusColor(envData.emailConfig.status)}`}>
                  <h3 className="font-bold mb-2">Email Configuration</h3>
                  <p>{envData.emailConfig.message}</p>
                </div>
                <div className={`p-4 rounded border ${getStatusColor(envData.authConfig.status)}`}>
                  <h3 className="font-bold mb-2">Authentication</h3>
                  <p>{envData.authConfig.message}</p>
                </div>
                <div className={`p-4 rounded border ${getStatusColor(envData.dbConfig.status)}`}>
                  <h3 className="font-bold mb-2">Database</h3>
                  <p>{envData.dbConfig.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>
                Status of individual environment variables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(envData.variables).map(([key, data]) => (
                  <div key={key} className="border-b pb-3 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{key}</span>
                      <Badge variant={data.status === 'OK' ? 'outline' : 'destructive'}>
                        {data.status}
                      </Badge>
                    </div>
                    {data.value && (
                      <div className="mt-1 text-sm text-gray-600">
                        Value: {key.includes('KEY') || key.includes('URL') ? '********' : data.value}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-sm text-gray-500 text-right">
            Last updated: {new Date(envData.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}