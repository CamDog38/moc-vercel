import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { InfoIcon, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { getBaseUrl } from '@/util/api-helpers';
import { getBaseUrl as getUrlHelperBaseUrl } from '@/util/url-helpers';

export default function UrlResolutionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [clientBaseUrl, setClientBaseUrl] = useState<string>('');
  const [urlHelperBaseUrl, setUrlHelperBaseUrl] = useState<string>('');
  const [urlMatch, setUrlMatch] = useState<boolean | null>(null);

  useEffect(() => {
    // Get the client-side base URLs from both helpers
    setClientBaseUrl(getBaseUrl());
    setUrlHelperBaseUrl(getUrlHelperBaseUrl());
  }, []);

  // Check if client and server URLs match when both are available
  useEffect(() => {
    if (clientBaseUrl && data?.resolvedUrls?.apiHelperBaseUrl) {
      setUrlMatch(clientBaseUrl === data.resolvedUrls.apiHelperBaseUrl);
    }
  }, [clientBaseUrl, data]);

  const fetchUrlResolutionData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/url-resolution');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrlResolutionData();
  }, []);

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
          <h1 className="text-2xl font-bold">URL Resolution Settings</h1>
          <p className="text-muted-foreground">Check and manage your URL configuration</p>
        </div>
        <Button onClick={fetchUrlResolutionData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* URL Match Status Card */}
      {urlMatch !== null && data?.resolvedUrls && (
        <Card className={`mb-6 ${urlMatch ? 'border-green-500' : 'border-amber-500'}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center">
              {urlMatch ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              )}
              <CardTitle>URL Resolution Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {urlMatch ? (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-800">
                <p className="text-green-800 dark:text-green-300">
                  <strong>Good news!</strong> Client and server base URLs match. This means your application should handle API calls correctly.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md border border-amber-200 dark:border-amber-800">
                <p className="text-amber-800 dark:text-amber-300">
                  <strong>Warning:</strong> Client and server base URLs don't match. This could cause issues with API calls between client and server.
                </p>
                <div className="mt-2">
                  <p className="text-sm font-semibold">Client URL: <span className="font-mono">{clientBaseUrl}</span></p>
                  <p className="text-sm font-semibold">Server URL: <span className="font-mono">{data.resolvedUrls.apiHelperBaseUrl}</span></p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Client-Side Base URLs</CardTitle>
            <CardDescription>
              The base URLs as resolved in your browser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="outline">API Helper</Badge>
                  <Badge variant="secondary">window.location based</Badge>
                </div>
                <p className="text-sm font-mono bg-muted p-2 rounded">{clientBaseUrl}</p>
              </div>
              
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="outline">URL Helper</Badge>
                  <Badge variant="secondary">window.location based</Badge>
                </div>
                <p className="text-sm font-mono bg-muted p-2 rounded">{urlHelperBaseUrl}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Server-Side Base URLs</CardTitle>
            <CardDescription>
              The base URLs as resolved on the server
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.resolvedUrls ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline">API Helper</Badge>
                    <Badge variant="secondary">{data.environment.NODE_ENV}</Badge>
                    {data.environment.VERCEL_URL && (
                      <Badge variant="secondary">Vercel</Badge>
                    )}
                  </div>
                  <p className="text-sm font-mono bg-muted p-2 rounded">{data.resolvedUrls.apiHelperBaseUrl}</p>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline">URL Helper (with req)</Badge>
                    <Badge variant="secondary">Request-based</Badge>
                  </div>
                  <p className="text-sm font-mono bg-muted p-2 rounded">{data.resolvedUrls.urlHelperBaseUrl}</p>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline">URL Helper (no req)</Badge>
                  </div>
                  <p className="text-sm font-mono bg-muted p-2 rounded">{data.resolvedUrls.urlHelperBaseUrlNoReq}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground italic">Loading server data...</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {data?.urlsMatch && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>URL Consistency Check</CardTitle>
            <CardDescription>
              Checking if different URL resolution methods return consistent results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`p-2 rounded-md ${data.urlsMatch.apiHelperMatchesUrlHelper ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                <span className="font-medium">API Helper matches URL Helper (with request): </span>
                <span>{data.urlsMatch.apiHelperMatchesUrlHelper ? 'Yes ✓' : 'No ✗'}</span>
              </div>
              <div className={`p-2 rounded-md ${data.urlsMatch.apiHelperMatchesUrlHelperNoReq ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                <span className="font-medium">API Helper matches URL Helper (without request): </span>
                <span>{data.urlsMatch.apiHelperMatchesUrlHelperNoReq ? 'Yes ✓' : 'No ✗'}</span>
              </div>
              <div className={`p-2 rounded-md ${data.urlsMatch.urlHelperMatchesUrlHelperNoReq ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                <span className="font-medium">URL Helper (with request) matches URL Helper (without request): </span>
                <span>{data.urlsMatch.urlHelperMatchesUrlHelperNoReq ? 'Yes ✓' : 'No ✗'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {data && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="environment">Environment Variables</TabsTrigger>
            <TabsTrigger value="request">Request Headers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <InfoIcon className="h-5 w-5 mr-2 text-blue-500" />
                  <CardTitle>How URL Resolution Works</CardTitle>
                </div>
                <CardDescription>
                  Understanding how base URLs are resolved in different contexts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">URL Resolution Priority</h3>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                      <li><strong>Client-side:</strong> Always uses <code className="bg-muted px-1 rounded">window.location</code> to ensure correct URL in browser context</li>
                      <li><strong>Server-side with request:</strong> Uses request headers to determine the URL</li>
                      <li><strong>Vercel deployment:</strong> Always prioritizes <code className="bg-muted px-1 rounded">VERCEL_URL</code> when available</li>
                      <li><strong>Development environment:</strong> Uses <code className="bg-muted px-1 rounded">localhost:3000</code> for consistent local development</li>
                      <li><strong>Production fallback:</strong> Only uses <code className="bg-muted px-1 rounded">NEXT_PUBLIC_BASE_URL</code> if no Vercel URL is available</li>
                    </ol>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold text-lg">Recent Changes</h3>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800 mt-2">
                      <p className="text-blue-800 dark:text-blue-300">
                        <strong>Update:</strong> The URL resolution logic has been updated to prioritize Vercel's URL over the environment variables. This ensures that your application will work correctly in all deployment environments, including preview deployments.
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold text-lg">Current Environment</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-muted p-2 rounded">
                        <span className="text-sm font-semibold">NODE_ENV:</span>
                        <span className="ml-2 font-mono">{data.environment.NODE_ENV}</span>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <span className="text-sm font-semibold">VERCEL_ENV:</span>
                        <span className="ml-2 font-mono">{data.environment.VERCEL_ENV}</span>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <span className="text-sm font-semibold">CO_DEV_ENV:</span>
                        <span className="ml-2 font-mono">{data.environment.NEXT_PUBLIC_CO_DEV_ENV}</span>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <span className="text-sm font-semibold">Timestamp:</span>
                        <span className="ml-2 font-mono text-xs">{data.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="environment" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
                <CardDescription>
                  Environment variables that affect URL resolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.environment).map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-muted p-3 rounded">
                      <div className="font-semibold text-sm">{key}</div>
                      <div className="font-mono text-sm mt-1">{value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="request" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Request Headers</CardTitle>
                <CardDescription>
                  Headers from your request that can help with URL resolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.requestHeaders).map(([key, value]: [string, any]) => (
                    value && (
                      <div key={key} className="bg-muted p-3 rounded">
                        <div className="font-semibold text-sm">{key}</div>
                        <div className="font-mono text-sm mt-1 break-all">{value}</div>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}