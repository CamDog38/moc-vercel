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
import { prisma } from '@/lib/prisma';
import { GetServerSideProps } from 'next';

interface FormToEmailTestPublicProps {
  formId: string;
  formName: string;
}

export const getServerSideProps: GetServerSideProps<FormToEmailTestPublicProps> = async ({ params }) => {
  const formId = params?.id as string;
  
  if (!formId) {
    return {
      notFound: true
    };
  }

  // Get form details
  const form = await prisma.form.findUnique({
    where: {
      id: formId,
      isActive: true
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!form) {
    return {
      notFound: true
    };
  }

  return {
    props: {
      formId: form.id,
      formName: form.name
    }
  };
};

export default function FormToEmailTestPublic({ formId, formName }: FormToEmailTestPublicProps) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formDataText, setFormDataText] = useState<string>('{\n  "email": "cameron@digitaljunction.ae",\n  "name": "Test User"\n}');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Add a log entry with timestamp
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };
  
  // Parse form data from text area
  const parseFormData = () => {
    try {
      const parsed = JSON.parse(formDataText);
      setFormData(parsed);
      addLog('Form data parsed successfully');
      return parsed;
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid JSON in form data",
        variant: "destructive",
      });
      addLog(`Error parsing form data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };
  
  // Test direct form submission
  const testFormSubmission = async () => {
    const data = parseFormData();
    if (!data) return;
    
    setIsLoading(true);
    setTestResult(null);
    addLog(`Testing form submission for form ID: ${formId}`);
    
    try {
      addLog(`Sending request to /api/forms/${formId}/submit`);
      const response = await fetch(`/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      setTestResult(result);
      
      addLog(`Form submission response: ${response.status} ${response.statusText}`);
      addLog(`Response data: ${JSON.stringify(result)}`);
      
      toast({
        title: response.ok ? "Success" : "Error",
        description: response.ok ? "Form submitted successfully" : "Form submission failed",
        variant: response.ok ? "default" : "destructive",
      });
    } catch (error) {
      addLog(`Error submitting form: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Error",
        description: "An error occurred while submitting the form",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test direct email processing using Form System 2.0 with original Email tables
  const testEmailProcessing = async () => {
    const data = parseFormData();
    if (!data) return;
    
    setIsLoading(true);
    setTestResult(null);
    addLog(`Testing email processing for form ID: ${formId} using Form System 2.0 with original Email tables`);
    
    try {
      addLog('Sending request to /api/emails2/process-rules2');
      addLog('Using Form System 2.0 email processing with detailed logging and original EmailRule/EmailTemplate tables');
      
      // Create a submission ID for testing
      const submissionId = `test-${Date.now()}`;
      
      const response = await fetch('/api/emails2/process-rules2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId,
          submissionId,
          data,
          source: 'debug_test_page',
        }),
      });
      
      const result = await response.json();
      setTestResult(result);
      
      addLog(`Email processing response: ${response.status} ${response.statusText}`);
      
      // Log detailed information about the email processing results
      if (result.processedRules !== undefined) {
        addLog(`Processed ${result.processedRules} email rules`);
      }
      
      if (result.queuedEmails !== undefined) {
        addLog(`Queued ${result.queuedEmails} emails for sending`);
      }
      
      if (result.correlationId) {
        addLog(`Correlation ID: ${result.correlationId}`);
      }
      
      // Display logs from the email processing if available
      if (result.logs && Array.isArray(result.logs)) {
        addLog('Email processing logs:');
        result.logs.forEach((log: any) => {
          addLog(`  [${log.level}] ${log.message}`);
        });
      }
      
      toast({
        title: result.success ? "Success" : "Warning",
        description: result.success ? 
          `Email processing completed successfully. Processed ${result.processedRules || 0} rules, queued ${result.queuedEmails || 0} emails.` : 
          "Email processing completed with warnings or errors.",
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      addLog(`Error processing email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Error",
        description: "An error occurred while processing the email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test direct email sending
  const testDirectEmail = async () => {
    const data = parseFormData();
    if (!data || !data.email) {
      toast({
        title: "Error",
        description: "Please include an email field in your form data",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setTestResult(null);
    addLog(`Testing direct email sending to: ${data.email}`);
    
    try {
      addLog('Sending request to /api/test/send-email');
      const response = await fetch('/api/test/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: data.email,
        }),
      });
      
      const result = await response.json();
      setTestResult(result);
      
      addLog(`Email test response: ${response.status} ${response.statusText}`);
      addLog(`Response data: ${JSON.stringify(result)}`);
      
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      addLog(`Error sending test email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Error",
        description: "An error occurred while sending the test email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Form to Email Connection Tester - {formName}</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="formData">Form Data (JSON)</Label>
                <Textarea
                  id="formData"
                  value={formDataText}
                  onChange={(e) => setFormDataText(e.target.value)}
                  className="font-mono"
                  rows={6}
                  placeholder="Enter form data as JSON"
                />
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={testFormSubmission} disabled={isLoading}>
                Test Form Submission
              </Button>
              <Button onClick={testEmailProcessing} disabled={isLoading} variant="secondary">
                Test Email Processing
              </Button>
              <Button onClick={testDirectEmail} disabled={isLoading} variant="outline">
                Test Direct Email
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div>
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Test Logs</CardTitle>
                <CardDescription>Real-time test execution logs</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-secondary/50 rounded-md p-4 h-[200px] overflow-auto space-y-1">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No logs yet...</p>
                ) : (
                  logs.map((log, i) => (
                    <p key={i} className="font-mono text-xs whitespace-pre-wrap">{log}</p>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {testResult && (
            <Card className={testResult.success ? "border-green-300" : "border-amber-300"}>
              <CardHeader className={testResult.success ? "bg-green-50" : "bg-amber-50"}>
                <div className="flex items-center">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                  )}
                  <CardTitle className={testResult.success ? "text-green-700" : "text-amber-700"}>
                    {testResult.success ? "Test Successful" : "Test Failed"}
                  </CardTitle>
                </div>
                {testResult.message && (
                  <CardDescription className={testResult.success ? "text-green-600" : "text-amber-600"}>
                    {testResult.message}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <pre className="bg-secondary/50 rounded-md p-4 overflow-auto text-xs">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
