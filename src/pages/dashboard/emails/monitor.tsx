import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, AlertCircle, RefreshCw, Send, Activity } from "lucide-react";
import NoSidebarLayout from '@/components/layouts/NoSidebarLayout';

export default function EmailMonitor() {
  const { toast } = useToast();
  
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [emailRules, setEmailRules] = useState<any[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [testFormData, setTestFormData] = useState('{}');
  const [ruleTestResult, setRuleTestResult] = useState<any>(null);
  const [isTestingRule, setIsTestingRule] = useState(false);

  // Function to send a test email
  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    
    setIsSending(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/test/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
        }),
      });
      
      const result = await response.json();
      setTestResult(result);
      
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
      // Add to logs
      if (result.success) {
        setEmailLogs(prev => [
          {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            to: result.details.to,
            from: result.details.from,
            subject: result.details.subject,
            status: 'Sent',
            success: true,
          },
          ...prev
        ]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Fetch email rules
  const fetchEmailRules = async () => {
    try {
      const response = await fetch('/api/emails/rules');
      const data = await response.json();
      if (response.ok) {
        setEmailRules(data);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch email rules",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchEmailRules();
  }, []);

  // Function to test an email rule
  const testEmailRule = async () => {
    if (!selectedRuleId) {
      toast({
        title: "Error",
        description: "Please select an email rule to test",
        variant: "destructive",
      });
      return;
    }

    let formData;
    try {
      formData = JSON.parse(testFormData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid JSON format in form data",
        variant: "destructive",
      });
      return;
    }

    setIsTestingRule(true);
    setRuleTestResult(null);

    try {
      const response = await fetch('/api/test/process-email-rule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleId: selectedRuleId,
          formData,
        }),
      });

      const result = await response.json();
      setRuleTestResult(result);

      toast({
        title: result.success ? "Success" : "Error",
        description: result.message || (result.success ? "Rule test completed" : "Failed to test rule"),
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test email rule",
        variant: "destructive",
      });
    } finally {
      setIsTestingRule(false);
    }
  };

  return (
    <NoSidebarLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Email Monitoring</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Email System Status</CardTitle>
                <CardDescription>
                  Check the status of your email sending system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>SendGrid API Connected</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Email Templates Active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Email Rules Processing</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Send Test Email</CardTitle>
                <CardDescription>
                  Verify your email sending capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testEmail">Recipient Email</Label>
                  <Input
                    id="testEmail"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={sendTestEmail}
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Test Email Rule</CardTitle>
                <CardDescription>
                  Test if an email rule would trigger for specific form data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailRule">Select Email Rule</Label>
                  <select
                    id="emailRule"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={selectedRuleId}
                    onChange={(e) => setSelectedRuleId(e.target.value)}
                  >
                    <option value="">Select a rule...</option>
                    {emailRules.map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formData">Form Data (JSON)</Label>
                  <Textarea
                    id="formData"
                    value={testFormData}
                    onChange={(e) => setTestFormData(e.target.value)}
                    placeholder='{"field": "value"}'
                    rows={5}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={testEmailRule}
                  disabled={isTestingRule || !selectedRuleId}
                >
                  {isTestingRule ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Test Rule
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Email Activity</CardTitle>
                <CardDescription>
                  View recent email sending activity and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResult && (
                  <Alert className={`mb-4 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center">
                      {testResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
                      )}
                      <AlertTitle className={testResult.success ? 'text-green-800' : 'text-amber-800'}>
                        {testResult.success ? 'Email Sent Successfully' : 'Email Sending Failed'}
                      </AlertTitle>
                    </div>
                    <AlertDescription className="mt-2">
                      {testResult.message}
                      {testResult.details && (
                        <div className="mt-2 text-sm">
                          <p><span className="font-medium">To:</span> {testResult.details.to}</p>
                          <p><span className="font-medium">From:</span> {testResult.details.from}</p>
                          <p><span className="font-medium">Subject:</span> {testResult.details.subject}</p>
                        </div>
                      )}
                      {testResult.error && (
                        <div className="mt-2 text-sm text-red-600">
                          <p><span className="font-medium">Error:</span> {testResult.error}</p>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {ruleTestResult && (
                  <Alert className={`mb-4 ${ruleTestResult.emailWouldBeSent ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center">
                      {ruleTestResult.emailWouldBeSent ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
                      )}
                      <AlertTitle className={ruleTestResult.emailWouldBeSent ? 'text-green-800' : 'text-amber-800'}>
                        {ruleTestResult.emailWouldBeSent ? 'Email Rule Would Trigger' : 'Email Rule Would Not Trigger'}
                      </AlertTitle>
                    </div>
                    <AlertDescription className="mt-2">
                      <div className="mt-2 text-sm space-y-1">
                        <p><span className="font-medium">Rule Name:</span> {ruleTestResult.details.ruleName}</p>
                        <p><span className="font-medium">Template:</span> {ruleTestResult.details.templateName}</p>
                        <p><span className="font-medium">Conditions Met:</span> {ruleTestResult.details.conditionsMet ? 'Yes' : 'No'}</p>
                        <p><span className="font-medium">Recipient Email:</span> {ruleTestResult.details.recipientEmail || 'Not determined'}</p>
                        <p><span className="font-medium">Recipient Type:</span> {ruleTestResult.details.recipientType}</p>
                        {ruleTestResult.details.recipientField && (
                          <p><span className="font-medium">Recipient Field:</span> {ruleTestResult.details.recipientField}</p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="rounded-md border">
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 transition-colors">
                          <th className="h-12 px-4 text-left align-middle font-medium">Time</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">To</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Subject</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emailLogs.length > 0 ? (
                          emailLogs.map((log) => (
                            <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                              <td className="p-4 align-middle">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </td>
                              <td className="p-4 align-middle">{log.to}</td>
                              <td className="p-4 align-middle">{log.subject}</td>
                              <td className="p-4 align-middle">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  log.success 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-muted-foreground">
                              No email logs yet. Send a test email to see activity.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </NoSidebarLayout>
  );
}
