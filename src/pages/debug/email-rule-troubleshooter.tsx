import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EmailRuleTroubleshooter() {
  const { user } = useAuth();
  const router = useRouter();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [forms, setForms] = useState<any[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch forms for the dropdown
    async function fetchForms() {
      try {
        setFormsLoading(true);
        const response = await fetch('/api/forms');
        if (!response.ok) {
          throw new Error('Failed to fetch forms');
        }
        const data = await response.json();
        setForms(data.forms || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setFormsLoading(false);
      }
    }

    fetchForms();
  }, [user, router]);

  // Fetch rules when a form is selected
  useEffect(() => {
    if (selectedForm) {
      fetchRules(selectedForm);
    }
  }, [selectedForm]);

  async function fetchRules(formId: string) {
    try {
      setLoading(true);
      const response = await fetch(`/api/debug/email-rules?formId=${formId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch email rules');
      }
      const data = await response.json();
      setRules(data.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const response = await fetch('/api/debug/logs');
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const data = await response.json();
      setLogs(data.logs.filter((log: any) => log.source === 'emails') || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      setEmailLogsLoading(true);
      const response = await fetch('/api/emails/logs');
      if (!response.ok) {
        throw new Error('Failed to fetch email logs');
      }
      const data = await response.json();
      setEmailLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setEmailLogsLoading(false);
    }
  };

  const getRecipientDescription = (rule: any) => {
    if (!rule.recipientType || rule.recipientType === 'form') {
      return 'Sends to form submitter\'s email';
    } else if (rule.recipientType === 'custom' && rule.recipientEmail) {
      return `Sends to custom email: ${rule.recipientEmail}`;
    } else if (rule.recipientType === 'field' && rule.recipientField) {
      return `Sends to email from form field: ${rule.recipientField}`;
    } else {
      return 'Invalid recipient configuration';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Email Rule Troubleshooter</h1>
      
      <Tabs defaultValue="rules">
        <TabsList className="mb-4">
          <TabsTrigger value="rules">Email Rules</TabsTrigger>
          <TabsTrigger value="logs">Debug Logs</TabsTrigger>
          <TabsTrigger value="emailLogs">Email Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rules">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Email Rules Configuration</CardTitle>
              <CardDescription>
                Review your email rules to ensure they are configured correctly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select Form</label>
                <div className="flex gap-2">
                  <Select
                    value={selectedForm}
                    onValueChange={setSelectedForm}
                    disabled={formsLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a form" />
                    </SelectTrigger>
                    <SelectContent>
                      {forms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          {form.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => fetchRules(selectedForm)}
                    disabled={!selectedForm || loading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {!selectedForm ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Select a Form</AlertTitle>
                  <AlertDescription>
                    Please select a form to view its email rules
                  </AlertDescription>
                </Alert>
              ) : loading ? (
                <p>Loading email rules...</p>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : rules.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>No Rules Found</AlertTitle>
                  <AlertDescription>
                    No email rules found for this form.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <Card key={rule.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{rule.name}</CardTitle>
                            <CardDescription>{rule.description || 'No description'}</CardDescription>
                          </div>
                          <Badge variant={rule.active ? 'default' : 'outline'}>
                            {rule.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-1">Template</h4>
                            <p className="text-sm text-muted-foreground">
                              {rule.emailTemplate?.name || rule.template?.name || 'No template'}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium mb-1">Form</h4>
                            <p className="text-sm text-muted-foreground">
                              {rule.form?.name || 'No form'}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium mb-1">Recipient Configuration</h4>
                            <p className="text-sm text-muted-foreground">
                              {getRecipientDescription(rule)}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium mb-1">Created</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(rule.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <Separator className="my-4" />
                        
                        <div className="flex justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/dashboard/emails/rules/${rule.id}`)}
                          >
                            Edit Rule
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Debug Logs</CardTitle>
              <CardDescription>
                View debug logs to diagnose email processing issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-2">
                <Button 
                  onClick={fetchLogs} 
                  disabled={logsLoading}
                >
                  {logsLoading ? 'Loading...' : 'Refresh Debug Logs'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    try {
                      await fetch('/api/debug/logs/clear', { method: 'POST' });
                      setLogs([]);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'An error occurred');
                    }
                  }}
                >
                  Clear Logs
                </Button>
              </div>
              
              {logsLoading ? (
                <p>Loading logs...</p>
              ) : logs.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>No Logs Found</AlertTitle>
                  <AlertDescription>
                    No debug logs are available. Click "Refresh Logs" to check for new logs.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {logs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-md text-sm ${
                        log.type === 'error' 
                          ? 'bg-destructive/10 text-destructive' 
                          : log.type === 'success' 
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
                            : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {log.type === 'error' ? (
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        ) : log.type === 'success' ? (
                          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-mono text-xs text-muted-foreground mb-1">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                          <div className="whitespace-pre-wrap">{log.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="emailLogs">
          <Card>
            <CardHeader>
              <CardTitle>Email Logs</CardTitle>
              <CardDescription>
                View database email logs to see what emails were sent and to whom
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button 
                  onClick={fetchEmailLogs} 
                  disabled={emailLogsLoading}
                >
                  {emailLogsLoading ? 'Loading...' : 'Refresh Email Logs'}
                </Button>
              </div>
              
              {emailLogsLoading ? (
                <p>Loading email logs...</p>
              ) : emailLogs.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>No Email Logs Found</AlertTitle>
                  <AlertDescription>
                    No email logs are available. Click "Refresh Email Logs" to check for new logs.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {emailLogs.map((log) => (
                    <Card key={log.id} className="overflow-hidden">
                      <CardHeader className={`pb-2 ${log.status === 'FAILED' ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{log.subject || 'No Subject'}</CardTitle>
                            <CardDescription>
                              Sent to: {log.recipient}
                              {log.ccRecipients && <span> | CC: {log.ccRecipients}</span>}
                              {log.bccRecipients && <span> | BCC: {log.bccRecipients}</span>}
                            </CardDescription>
                          </div>
                          <Badge variant={log.status === 'SENT' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-1">Template</h4>
                            <p className="text-sm text-muted-foreground">
                              {log.template?.name || 'No template'}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium mb-1">Sent At</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {log.error && (
                            <div className="col-span-2">
                              <h4 className="font-medium mb-1">Error</h4>
                              <p className="text-sm text-destructive">
                                {log.error}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}