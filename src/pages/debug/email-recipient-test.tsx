import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Info, Code } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function EmailRecipientTest() {
  const { user } = useAuth();
  const router = useRouter();
  const [ruleId, setRuleId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('analysis');
  
  // API Test specific states
  const [apiTestRuleId, setApiTestRuleId] = useState<string>('');
  const [apiTestLoading, setApiTestLoading] = useState<boolean>(false);
  const [apiTestError, setApiTestError] = useState<string | null>(null);
  const [apiTestResponse, setApiTestResponse] = useState<string>('');

  // Get ruleId from URL query if available
  useEffect(() => {
    if (router.query.ruleId) {
      setRuleId(router.query.ruleId as string);
      fetchData(router.query.ruleId as string);
    }
  }, [router.query.ruleId]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const fetchData = async (id: string) => {
    if (!id) {
      setError('Please enter a rule ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/debug/email-recipient-test?ruleId=${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(ruleId);
    
    // Update URL with ruleId for sharing
    router.push({
      pathname: router.pathname,
      query: { ruleId }
    }, undefined, { shallow: true });
  };
  
  // Function to test the API endpoint directly
  const testApiEndpoint = async (id: string) => {
    if (!id) {
      setApiTestError('Please enter a rule ID');
      return;
    }

    setApiTestLoading(true);
    setApiTestError(null);
    setApiTestResponse('');

    try {
      const response = await fetch(`/api/debug/email-recipient-test?ruleId=${id}`);
      const responseText = await response.text();
      
      try {
        // Try to parse as JSON for pretty formatting
        const jsonData = JSON.parse(responseText);
        setApiTestResponse(JSON.stringify(jsonData, null, 2));
      } catch {
        // If not valid JSON, just show the raw response
        setApiTestResponse(responseText);
      }
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
    } catch (err: any) {
      setApiTestError(err.message || 'An error occurred while testing the API');
    } finally {
      setApiTestLoading(false);
    }
  };
  
  const handleApiTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    testApiEndpoint(apiTestRuleId);
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Email Recipient Configuration Test</h1>
      
      <Tabs defaultValue="ui-test" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="ui-test">UI Test</TabsTrigger>
          <TabsTrigger value="api-test">API Test</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ui-test">
          <Card>
            <CardHeader>
              <CardTitle>Test Email Rule Recipient Configuration</CardTitle>
              <CardDescription>
                Enter an email rule ID to analyze its recipient configuration and identify potential issues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex gap-4">
                <Input
                  value={ruleId}
                  onChange={(e) => setRuleId(e.target.value)}
                  placeholder="Enter rule ID"
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? 'Analyzing...' : 'Analyze'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="api-test">
          <Card>
            <CardHeader>
              <CardTitle>Test API Endpoint Directly</CardTitle>
              <CardDescription>
                Test the API endpoint directly and view the raw response.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <form onSubmit={handleApiTestSubmit} className="flex gap-4">
                  <Input
                    value={apiTestRuleId}
                    onChange={(e) => setApiTestRuleId(e.target.value)}
                    placeholder="Enter rule ID for API test"
                    className="flex-1"
                  />
                  <Button type="submit" disabled={apiTestLoading}>
                    {apiTestLoading ? 'Testing...' : 'Test API'}
                  </Button>
                </form>
                
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="h-4 w-4" />
                    <h3 className="text-sm font-medium">API Endpoint</h3>
                  </div>
                  <code className="block p-2 bg-muted rounded-md text-sm">
                    GET /api/debug/email-recipient-test?ruleId={apiTestRuleId || 'YOUR_RULE_ID'}
                  </code>
                </div>
                
                {apiTestError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>API Error</AlertTitle>
                    <AlertDescription>{apiTestError}</AlertDescription>
                  </Alert>
                )}
                
                {apiTestResponse && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="h-4 w-4" />
                      <h3 className="text-sm font-medium">API Response</h3>
                    </div>
                    <Textarea 
                      value={apiTestResponse}
                      readOnly
                      className="font-mono text-xs h-[400px] overflow-auto"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[300px]" />
              <Skeleton className="h-4 w-[250px]" />
            </div>
          </CardContent>
        </Card>
      )}

      {data && !loading && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Rule: {data.rule.name}</CardTitle>
                <div className="flex gap-2">
                  {data.analysis.mappingIssues && data.analysis.mappingIssues.length > 0 && (
                    <Badge variant="destructive">
                      {data.analysis.mappingIssues.length} Mapping {data.analysis.mappingIssues.length === 1 ? 'Issue' : 'Issues'}
                    </Badge>
                  )}
                  <Badge variant={data.analysis.potentialIssues.length > 0 ? "destructive" : "success"}>
                    {data.analysis.potentialIssues.length > 0 ? 'Issues Found' : 'No Issues'}
                  </Badge>
                </div>
              </div>
              <CardDescription>
                Form: {data.form.name} (ID: {data.form.id})
              </CardDescription>
            </CardHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  <TabsTrigger value="configuration">Configuration</TabsTrigger>
                  <TabsTrigger value="form">Form Fields</TabsTrigger>
                  <TabsTrigger value="schema">Database Schema</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="analysis" className="p-6 pt-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Recipient Source</h3>
                      <p className="text-lg font-medium">{data.analysis.recipientSource}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Recipient Value</h3>
                      <p className="text-lg font-medium">{data.analysis.recipientValue || 'Not specified'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">CC Emails</h3>
                      <p className="text-lg font-medium">{data.analysis.hasCc ? 'Configured' : 'Not configured'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">BCC Emails</h3>
                      <p className="text-lg font-medium">{data.analysis.hasBcc ? 'Configured' : 'Not configured'}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Recipient Mapping Issues Section */}
                  {data.analysis.mappingIssues && data.analysis.mappingIssues.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-2">Recipient Mapping Issues</h3>
                      <div className="space-y-2">
                        {data.analysis.mappingIssues.map((issue: any, index: number) => {
                          let alertVariant: "default" | "destructive" | "outline" = "default";
                          let icon = <Info className="h-4 w-4" />;
                          
                          // Set appropriate styling based on severity
                          if (issue.severity === 'critical') {
                            alertVariant = "destructive";
                            icon = <AlertCircle className="h-4 w-4" />;
                          } else if (issue.severity === 'warning') {
                            alertVariant = "default";
                            icon = <AlertCircle className="h-4 w-4" />;
                          } else if (issue.severity === 'suggestion') {
                            alertVariant = "outline";
                            icon = <Info className="h-4 w-4" />;
                          }
                          
                          return (
                            <Alert key={index} variant={alertVariant}>
                              {icon}
                              <AlertTitle>
                                {issue.severity === 'critical' ? 'Critical Mapping Issue' : 
                                 issue.severity === 'warning' ? 'Warning' : 'Suggestion'}
                              </AlertTitle>
                              <AlertDescription className="space-y-2">
                                <p>{issue.message}</p>
                                
                                {/* Show alternative fields if available */}
                                {issue.alternativeFields && issue.alternativeFields.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium">Alternative email fields:</p>
                                    <ul className="list-disc pl-5 text-sm">
                                      {issue.alternativeFields.map((field: any) => (
                                        <li key={field.id}>
                                          {field.label} (ID: {field.id})
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Show mapped fields if available */}
                                {issue.mappedFields && issue.mappedFields.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium">Fields mapped as "email":</p>
                                    <ul className="list-disc pl-5 text-sm">
                                      {issue.mappedFields.map((field: any) => (
                                        <li key={field.id}>
                                          {field.label} (ID: {field.id})
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </AlertDescription>
                            </Alert>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Potential Issues</h3>
                    {data.analysis.potentialIssues.length > 0 ? (
                      <div className="space-y-2">
                        {data.analysis.potentialIssues.map((issue: string, index: number) => (
                          <Alert key={index} variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Issue Detected</AlertTitle>
                            <AlertDescription>{issue}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    ) : (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>All Good</AlertTitle>
                        <AlertDescription>No issues detected with recipient configuration.</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="configuration" className="p-6 pt-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Recipient Type</h3>
                      <p className="text-lg font-medium">{data.rule.recipientType || 'Not specified'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Recipient Email</h3>
                      <p className="text-lg font-medium">{data.rule.recipientEmail || 'Not specified'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Recipient Field</h3>
                      <p className="text-lg font-medium">{data.rule.recipientField || 'Not specified'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Template</h3>
                      <p className="text-lg font-medium">{data.template.name} (ID: {data.template.id})</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">CC Emails</h3>
                      <p className="text-lg font-medium">{data.rule.ccEmails || data.template.ccEmails || 'Not specified'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">BCC Emails</h3>
                      <p className="text-lg font-medium">{data.rule.bccEmails || data.template.bccEmails || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="form" className="p-6 pt-2">
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Form Fields</AlertTitle>
                    <AlertDescription>
                      These are the available fields in the form that can be used for recipient selection.
                    </AlertDescription>
                  </Alert>
                  
                  {data.form.fields.length > 0 ? (
                    <>
                      {data.rule.recipientTypeLower === 'field' && (
                        <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded bg-green-950/20"></div>
                            <span>Selected email field</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded bg-amber-950/20"></div>
                            <span>Selected non-email field (warning)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded bg-blue-950/20"></div>
                            <span>Field mapped as "email" but not selected</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded bg-slate-950/20"></div>
                            <span>Available email field</span>
                          </div>
                        </div>
                      )}
                      <div className="border rounded-md">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Field ID</th>
                              <th className="text-left p-2">Label</th>
                              <th className="text-left p-2">Type</th>
                              <th className="text-left p-2">Mapping</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.form.fields.map((field: any) => {
                              // Check if this field is involved in any mapping issues
                              const isSelectedField = field.id === data.rule.recipientField;
                              const isMappedAsEmail = field.mapping === 'email';
                              const isEmailType = field.type === 'email';
                              
                              // Determine row styling based on field status
                              let rowClassName = "border-b";
                              let fieldNote = null;
                              
                              if (isSelectedField && data.rule.recipientTypeLower === 'field') {
                                if (!isEmailType) {
                                  // Warning: Selected field is not an email type
                                  rowClassName += " bg-amber-950/20";
                                  fieldNote = "Selected as recipient but not an email field";
                                } else {
                                  // Success: Correctly selected email field
                                  rowClassName += " bg-green-950/20";
                                  fieldNote = "Currently selected as recipient";
                                }
                              } else if (isMappedAsEmail && !isSelectedField && data.rule.recipientTypeLower === 'field') {
                                // Info: Field is mapped as email but not selected
                                rowClassName += " bg-blue-950/20";
                                fieldNote = "Mapped as email but not selected as recipient";
                              } else if (isEmailType && data.rule.recipientTypeLower === 'field' && data.rule.recipientField && data.rule.recipientField !== field.id) {
                                // Suggestion: Email field available but not selected
                                rowClassName += " bg-slate-950/20";
                                fieldNote = "Email field available for selection";
                              }
                              
                              return (
                                <tr key={field.id} className={rowClassName}>
                                  <td className="p-2">{field.id}</td>
                                  <td className="p-2">
                                    {field.label}
                                    {fieldNote && (
                                      <div className="text-xs mt-1 text-muted-foreground">
                                        {fieldNote}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    {field.type}
                                    {field.type === 'email' && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        email
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    {field.mapping ? (
                                      <Badge variant="secondary" className="font-mono text-xs">
                                        {field.mapping}
                                      </Badge>
                                    ) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No Fields</AlertTitle>
                      <AlertDescription>This form has no fields defined.</AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="schema" className="p-6 pt-2">
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Database Schema</AlertTitle>
                    <AlertDescription>
                      This shows the current database schema for the EmailRule table.
                    </AlertDescription>
                  </Alert>
                  
                  {data.databaseSchema && data.databaseSchema.emailRuleColumns ? (
                    <div className="border rounded-md">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Column Name</th>
                            <th className="text-left p-2">Data Type</th>
                            <th className="text-left p-2">Nullable</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.databaseSchema.emailRuleColumns.map((column: any, index: number) => (
                            <tr key={index} className="border-b">
                              <td className="p-2">{column.column_name}</td>
                              <td className="p-2">{column.data_type}</td>
                              <td className="p-2">{column.is_nullable}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Schema Error</AlertTitle>
                      <AlertDescription>
                        {data.databaseSchema?.error || 'Unable to retrieve database schema information.'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Rule ID: {data.rule.id}
              </div>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}