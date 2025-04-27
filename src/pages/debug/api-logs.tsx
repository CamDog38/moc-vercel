import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TopNav } from '@/components/TopNav';

// Define log entry type
interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
  source: 'leads' | 'bookings' | 'emails' | 'forms' | 'other';
}

export default function ApiLogsDebug() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Function to fetch logs from the server
  const fetchLogs = async () => {
    try {
      // Add a cache-busting parameter to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/debug/logs?t=${timestamp}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
      
      // Add a toast notification when new logs are received
      if (data.logs && data.logs.length > logs.length && logs.length > 0) {
        toast({
          title: "New Logs Available",
          description: `Received ${data.logs.length - logs.length} new log entries.`,
        });
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to fetch logs',
        variant: "destructive",
      });
    }
  };

  // Function to start polling for logs
  const startPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    const interval = setInterval(fetchLogs, 2000); // Poll every 2 seconds
    setPollingInterval(interval);
    setIsPolling(true);
    
    toast({
      title: "Auto-Refresh Enabled",
      description: "Logs will automatically refresh every 2 seconds.",
    });
  };

  // Function to stop polling
  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setIsPolling(false);
    
    toast({
      title: "Auto-Refresh Disabled",
      description: "Logs will no longer automatically refresh.",
    });
  };

  // Function to clear logs
  const clearLogs = async () => {
    try {
      // Add a cache-busting parameter to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/debug/logs/clear?t=${timestamp}`, { 
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clear logs: ${response.status}`);
      }
      
      // Clear local logs immediately
      setLogs([]);
      
      toast({
        title: "Logs Cleared",
        description: "All logs have been cleared.",
      });
      
      // Fetch logs again after a short delay to ensure we get the latest state
      setTimeout(fetchLogs, 500);
    } catch (error) {
      console.error('Error clearing logs:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to clear logs',
        variant: "destructive",
      });
    }
  };

  // Function to test email processing directly
  const testEmailProcessing = async () => {
    try {
      // Add a log entry for the test
      const testLog: LogEntry = {
        timestamp: new Date().toISOString(),
        message: 'Testing email processing API directly...',
        type: 'info',
        source: 'other'
      };
      setLogs(prev => [...prev, testLog]);
      
      // Call the email processing API directly
      const response = await fetch('/api/emails/process-submission2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: 'cm7ykbp940002xuzvlkkxnwjm', // Use a known form ID
          formData: {
            name: 'Test User',
            email: 'test@example.com',
            phone: '+1234567890',
            message: 'This is a direct test of the email processing API'
          }
        }),
      });
      
      const result = await response.json();
      
      // Add the result to the logs
      const resultLog: LogEntry = {
        timestamp: new Date().toISOString(),
        message: `Email processing result: ${JSON.stringify(result)}`,
        type: response.ok ? 'success' : 'error',
        source: 'emails'
      };
      setLogs(prev => [...prev, resultLog]);
      
      toast({
        title: response.ok ? "Test Successful" : "Test Failed",
        description: response.ok 
          ? "Email processing API was called successfully." 
          : `Error: ${result.error || 'Unknown error'}`,
        variant: response.ok ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error testing email processing:', error);
      
      // Add the error to the logs
      const errorLog: LogEntry = {
        timestamp: new Date().toISOString(),
        message: `Error testing email processing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        source: 'emails'
      };
      setLogs(prev => [...prev, errorLog]);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to test email processing',
        variant: "destructive",
      });
    }
  };
  
  // Function to test invoice email sending
  const testInvoiceEmailSending = async () => {
    try {
      // Add a log entry for the test
      const testLog: LogEntry = {
        timestamp: new Date().toISOString(),
        message: 'Testing invoice email sending API...',
        type: 'info',
        source: 'emails'
      };
      setLogs(prev => [...prev, testLog]);
      
      // First, get a list of invoices to find one to use for testing
      const invoicesResponse = await fetch('/api/invoices');
      const invoicesData = await invoicesResponse.json();
      
      if (!invoicesResponse.ok) {
        throw new Error(`Failed to fetch invoices: ${invoicesData.error || 'Unknown error'}`);
      }
      
      if (!invoicesData.invoices || invoicesData.invoices.length === 0) {
        throw new Error('No invoices found to test with');
      }
      
      // Use the first invoice for testing
      const testInvoice = invoicesData.invoices[0];
      
      // Log the invoice we're using
      const invoiceLog: LogEntry = {
        timestamp: new Date().toISOString(),
        message: `Using invoice ID: ${testInvoice.id} for testing`,
        type: 'info',
        source: 'emails'
      };
      setLogs(prev => [...prev, invoiceLog]);
      
      // Call the invoice email sending API
      const response = await fetch('/api/emails/send-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: testInvoice.id,
        }),
      });
      
      const result = await response.json();
      
      // Add the result to the logs
      const resultLog: LogEntry = {
        timestamp: new Date().toISOString(),
        message: `Invoice email sending result: ${JSON.stringify(result)}`,
        type: response.ok ? 'success' : 'error',
        source: 'emails'
      };
      setLogs(prev => [...prev, resultLog]);
      
      // Also call the invoice send API to mark it as sent
      const sendResponse = await fetch(`/api/invoices/${testInvoice.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const sendResult = await sendResponse.json();
      
      // Add the send result to the logs
      const sendResultLog: LogEntry = {
        timestamp: new Date().toISOString(),
        message: `Invoice send API result: ${JSON.stringify(sendResult)}`,
        type: sendResponse.ok ? 'success' : 'error',
        source: 'emails'
      };
      setLogs(prev => [...prev, sendResultLog]);
      
      toast({
        title: response.ok && sendResponse.ok ? "Test Successful" : "Test Failed",
        description: response.ok && sendResponse.ok
          ? "Invoice email was sent successfully and invoice was marked as sent." 
          : `Error: ${result.error || sendResult.error || 'Unknown error'}`,
        variant: response.ok && sendResponse.ok ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error testing invoice email sending:', error);
      
      // Add the error to the logs
      const errorLog: LogEntry = {
        timestamp: new Date().toISOString(),
        message: `Error testing invoice email sending: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        source: 'emails'
      };
      setLogs(prev => [...prev, errorLog]);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to test invoice email sending',
        variant: "destructive",
      });
    }
  };

  // Filter logs based on active tab
  const filteredLogs = logs.filter(log => {
    if (activeTab === 'all') return true;
    if (activeTab === 'errors') return log.type === 'error';
    return log.source === activeTab;
  });

  // Initial fetch when component mounts
  useEffect(() => {
    fetchLogs();
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  // Variable replacement debugging
  const [template, setTemplate] = useState<string>('Hello {"{{"}}name{"}}"}, welcome to our service!');
  const [variablesJson, setVariablesJson] = useState<string>('{\n  "name": "John Doe",\n  "email": "john@example.com"\n}');
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugError, setDebugError] = useState<string | null>(null);

  // Function to test variable replacement
  const testVariableReplacement = async () => {
    try {
      setDebugError(null);
      
      // Parse the variables JSON
      let variables;
      try {
        variables = JSON.parse(variablesJson);
      } catch (error) {
        setDebugError('Invalid JSON format for variables');
        return;
      }
      
      // Call the variable replacement debug API
      const response = await fetch('/api/debug/variable-replacement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template,
          variables,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        setDebugError(result.error || 'Unknown error');
        return;
      }
      
      setDebugResult(result);
      
      // Add a log entry for the test
      const testLog: LogEntry = {
        timestamp: new Date().toISOString(),
        message: `Variable replacement debug: ${JSON.stringify(result.analysis)}`,
        type: 'info',
        source: 'emails'
      };
      setLogs(prev => [testLog, ...prev]);
      
      toast({
        title: "Variable Replacement Test",
        description: `Found ${result.analysis.length} variables in template`,
      });
    } catch (error) {
      console.error('Error testing variable replacement:', error);
      setDebugError(error instanceof Error ? error.message : 'Unknown error');
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to test variable replacement',
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <TopNav />
      <div className="container mx-auto py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>API Logs Debug</CardTitle>
            <CardDescription>
              View and monitor API logs for debugging purposes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-4">
              <div className="space-x-2">
                <Button onClick={fetchLogs} variant="outline">
                  Refresh Logs
                </Button>
                {isPolling ? (
                  <Button onClick={stopPolling} variant="outline" className="bg-red-50">
                    Stop Auto-Refresh
                  </Button>
                ) : (
                  <Button onClick={startPolling} variant="outline" className="bg-green-50">
                    Start Auto-Refresh
                  </Button>
                )}
              </div>
              <div className="space-x-2">
                <Button onClick={testEmailProcessing} variant="outline" className="bg-blue-50">
                  Test Email Processing
                </Button>
                <Button onClick={testInvoiceEmailSending} variant="outline" className="bg-purple-50">
                  Test Invoice Email
                </Button>
                <Button onClick={clearLogs} variant="outline" className="bg-red-50">
                  Clear Logs
                </Button>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Logs</TabsTrigger>
                <TabsTrigger value="leads">Leads API</TabsTrigger>
                <TabsTrigger value="bookings">Bookings API</TabsTrigger>
                <TabsTrigger value="emails">Emails API</TabsTrigger>
                <TabsTrigger value="forms">Forms API</TabsTrigger>
                <TabsTrigger value="errors">Errors</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="mt-0">
                <div className="bg-secondary/20 rounded-md p-4 h-[600px] overflow-auto space-y-1 text-xs">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`font-mono whitespace-pre-wrap p-2 rounded ${
                          log.type === 'error' 
                            ? 'bg-red-100 text-red-800' 
                            : log.type === 'success' 
                              ? 'bg-green-100 text-green-800' 
                              : log.source === 'emails' && (log.message.includes('Email CC:') || log.message.includes('Email BCC:'))
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100'
                        }`}
                      >
                        <span className="font-semibold">[{log.timestamp}]</span> 
                        <span className="ml-2 uppercase text-xs font-bold">{log.source}:</span> 
                        <span className="ml-2">{log.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No logs available. Try refreshing or performing an action that generates logs.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variable Replacement Debugger</CardTitle>
            <CardDescription>
              Test variable replacement in templates to diagnose issues with the name variable or other variables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template">Template with Variables</Label>
                  <Textarea 
                    id="template"
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="h-40 font-mono"
                    placeholder="Enter template with {variable} placeholders"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use double curly braces for variables: {'{{'}variable_name{'}}'}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="variables">Variables (JSON format)</Label>
                  <Textarea 
                    id="variables"
                    value={variablesJson}
                    onChange={(e) => setVariablesJson(e.target.value)}
                    className="h-40 font-mono"
                    placeholder='{"name": "John Doe", "email": "john@example.com"}'
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter variables in JSON format
                  </p>
                </div>
                
                <Button onClick={testVariableReplacement} className="w-full">
                  Test Variable Replacement
                </Button>
                
                {debugError && (
                  <div className="bg-red-100 text-red-800 p-3 rounded">
                    {debugError}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Results</h3>
                {debugResult ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium">Variable Analysis</h4>
                      <div className="bg-secondary/20 rounded-md p-3 max-h-[200px] overflow-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-1">Variable</th>
                              <th className="text-left p-1">Exists</th>
                              <th className="text-left p-1">Value</th>
                              <th className="text-left p-1">Whitespace Issue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {debugResult.analysis.map((item: any, i: number) => (
                              <tr key={i} className="border-b border-secondary/30">
                                <td className="p-1 font-mono">{item.variableName}</td>
                                <td className="p-1">
                                  <span className={item.exists ? "text-green-600" : "text-red-600"}>
                                    {item.exists ? "✓" : "✗"}
                                  </span>
                                </td>
                                <td className="p-1 font-mono">{item.value !== null ? item.value : "—"}</td>
                                <td className="p-1">
                                  <span className={item.whitespaceIssue ? "text-red-600" : "text-green-600"}>
                                    {item.whitespaceIssue ? "✗" : "✓"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium">Replaced Template</h4>
                      <div className="bg-secondary/20 rounded-md p-3 max-h-[200px] overflow-auto">
                        <pre className="text-xs whitespace-pre-wrap">{debugResult.replacedTemplate}</pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Run the test to see variable replacement results
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
