import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { prisma } from '@/lib/prisma';
import { GetServerSideProps } from 'next';

interface InvoiceEmailTestProps {
  invoices: any[];
}

export const getServerSideProps: GetServerSideProps<InvoiceEmailTestProps> = async () => {
  try {
    // Get all invoices with booking information
    const invoices = await prisma.invoice.findMany({
      take: 20, // Limit to 20 most recent invoices
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        booking: true
      }
    });

    return {
      props: {
        invoices: JSON.parse(JSON.stringify(invoices))
      }
    };
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return {
      props: {
        invoices: []
      }
    };
  }
};

export default function InvoiceEmailTest({ invoices }: InvoiceEmailTestProps) {
  const { toast } = useToast();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ message: string; type: string; timestamp: string }>>([]);
  const [testResult, setTestResult] = useState<any>(null);

  // Helper function to add logs with timestamps
  const addLog = (message: string, type: 'info' | 'success' | 'error') => {
    const timestamp = new Date().toISOString();
    setLogs(prevLogs => [...prevLogs, { message, type, timestamp }]);
  };

  // Function to test invoice email sending
  const testInvoiceEmail = async () => {
    if (!selectedInvoiceId) {
      toast({
        title: "No invoice selected",
        description: "Please select an invoice to test",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setTestResult(null);
    addLog(`Testing invoice email for invoice ID: ${selectedInvoiceId}`, 'info');

    try {
      // Call the invoice send API
      const response = await fetch(`/api/invoices/${selectedInvoiceId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }
      
      setTestResult({
        success: true,
        data
      });
      
      addLog('Invoice email test completed successfully', 'success');
      addLog(`Response: ${JSON.stringify(data)}`, 'info');
      
      toast({
        title: "Email test successful",
        description: "The invoice email was processed successfully",
      });
    } catch (error: any) {
      console.error('Error testing invoice email:', error);
      
      setTestResult({
        success: false,
        error: error.message
      });
      
      addLog(`Error testing invoice email: ${error.message}`, 'error');
      
      toast({
        title: "Email test failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared', 'info');
  };

  // Function to fetch API logs
  const fetchApiLogs = async () => {
    try {
      addLog('Fetching API logs...', 'info');
      const response = await fetch('/api/debug/logs');
      const data = await response.json();
      
      if (data && Array.isArray(data.logs)) {
        // Filter logs related to emails
        const emailLogs = data.logs.filter((log: any) => 
          log.category === 'emails' || log.message.includes('email') || log.message.includes('invoice')
        );
        
        // Add each log to our local logs
        emailLogs.forEach((log: any) => {
          addLog(`[API] ${log.message}`, log.type as 'info' | 'success' | 'error');
        });
        
        addLog(`Fetched ${emailLogs.length} email-related API logs`, 'success');
      } else {
        addLog('No API logs found or invalid response format', 'error');
      }
    } catch (error: any) {
      console.error('Error fetching API logs:', error);
      addLog(`Error fetching API logs: ${error.message}`, 'error');
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Invoice Email Testing</h1>
          <p className="text-muted-foreground">
            Test sending invoice emails using the email processing system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Test Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
              <CardDescription>
                Select an invoice and test email sending
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-select">Select Invoice</Label>
                <Select
                  value={selectedInvoiceId}
                  onValueChange={setSelectedInvoiceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber || 'No Invoice #'} - {invoice.booking?.name || 'Unknown Client'} (${invoice.totalAmount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={testInvoiceEmail} 
                  disabled={!selectedInvoiceId || loading}
                >
                  {loading ? "Testing..." : "Test Invoice Email"}
                </Button>
                <Button variant="outline" onClick={fetchApiLogs}>
                  Fetch API Logs
                </Button>
                <Button variant="outline" onClick={clearLogs}>
                  Clear Logs
                </Button>
              </div>
              
              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {testResult.success ? "Test Successful" : "Test Failed"}
                  </AlertTitle>
                  <AlertDescription>
                    {testResult.success 
                      ? "The invoice email was processed successfully." 
                      : `Error: ${testResult.error}`}
                  </AlertDescription>
                  {testResult.data && (
                    <div className="mt-2">
                      <p className="font-semibold">Response Data:</p>
                      <pre className="text-xs bg-secondary p-2 rounded-md overflow-x-auto">
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
          
          {/* Right Column - Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Test Logs</CardTitle>
              <CardDescription>
                View logs from the email testing process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] overflow-y-auto border rounded-md p-4 bg-muted/20">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No logs yet. Run a test to see logs.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`p-2 rounded-md border ${
                          log.type === 'success' ? 'bg-green-50 border-green-200' : 
                          log.type === 'error' ? 'bg-red-50 border-red-200' : 
                          'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${
                            log.type === 'success' ? 'text-green-700' : 
                            log.type === 'error' ? 'text-red-700' : 
                            'text-blue-700'
                          }`}>
                            {log.type.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{log.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
