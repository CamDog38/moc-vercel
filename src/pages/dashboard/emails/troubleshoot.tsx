import React, { useState } from 'react';
import { useRouter } from 'next/router';
import NoSidebarLayout from '@/components/layouts/NoSidebarLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import EmailErrorDisplay from '@/components/EmailErrorDisplay';
import { useAuth } from '@/contexts/AuthContext';

const EmailTroubleshooter: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('Test Email');
  const [testContent, setTestContent] = useState('<p>This is a test email to verify the email sending functionality.</p>');
  const [activeTab, setActiveTab] = useState('connection');

  const runConnectionTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/debug/env-check', {
        method: 'GET',
      });
      
      const data = await response.json();
      setResult(data);
      
      if (!response.ok) {
        setError(data);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      setError({ message: 'Please enter a recipient email address' });
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/emails/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          subject: testSubject,
          html: testContent,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          message: `Test email sent successfully to ${testEmail}`,
          details: data,
        });
      } else {
        setError(data);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const viewLogs = () => {
    router.push('/dashboard/emails/monitor');
  };

  return (
    <NoSidebarLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Email Troubleshooter</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="connection">Connection Test</TabsTrigger>
            <TabsTrigger value="send">Send Test Email</TabsTrigger>
            <TabsTrigger value="logs">Email Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="connection">
            <Card>
              <CardHeader>
                <CardTitle>Email Service Connection Test</CardTitle>
                <CardDescription>
                  Test the connection to the email service and verify that all required environment variables are set.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertTitle>Information</AlertTitle>
                  <AlertDescription>
                    This test will check if the required environment variables for email sending are properly configured.
                    It will not send any actual emails.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={viewLogs}>View Email Logs</Button>
                <Button onClick={runConnectionTest} disabled={loading}>
                  {loading ? 'Testing...' : 'Run Connection Test'}
                </Button>
              </CardFooter>
            </Card>
            
            {error && (
              <div className="mt-4">
                <EmailErrorDisplay error={error} onRetry={runConnectionTest} onDismiss={() => setError(null)} />
              </div>
            )}
            
            {result && !error && (
              <Card className="mt-4 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-700">Connection Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert variant="default" className="bg-green-100 border-green-200">
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>
                      Email service connection test completed successfully.
                    </AlertDescription>
                  </Alert>
                  
                  <Accordion type="single" collapsible className="mt-4">
                    <AccordionItem value="details">
                      <AccordionTrigger>Environment Details</AccordionTrigger>
                      <AccordionContent>
                        <pre className="bg-white p-3 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="send">
            <Card>
              <CardHeader>
                <CardTitle>Send Test Email</CardTitle>
                <CardDescription>
                  Send a test email to verify that the email sending functionality is working correctly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipient">Recipient Email</Label>
                    <Input
                      id="recipient"
                      placeholder="recipient@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Test Email"
                      value={testSubject}
                      onChange={(e) => setTestSubject(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="content">Email Content (HTML)</Label>
                    <Textarea
                      id="content"
                      placeholder="<p>This is a test email.</p>"
                      value={testContent}
                      onChange={(e) => setTestContent(e.target.value)}
                      rows={5}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={viewLogs}>View Email Logs</Button>
                <Button onClick={sendTestEmail} disabled={loading}>
                  {loading ? 'Sending...' : 'Send Test Email'}
                </Button>
              </CardFooter>
            </Card>
            
            {error && (
              <div className="mt-4">
                <EmailErrorDisplay error={error} onRetry={sendTestEmail} onDismiss={() => setError(null)} />
              </div>
            )}
            
            {result && !error && (
              <Card className="mt-4 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-700">Email Sent Successfully</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert variant="default" className="bg-green-100 border-green-200">
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>
                      {result.message}
                    </AlertDescription>
                  </Alert>
                  
                  {result.details && (
                    <Accordion type="single" collapsible className="mt-4">
                      <AccordionItem value="details">
                        <AccordionTrigger>Response Details</AccordionTrigger>
                        <AccordionContent>
                          <pre className="bg-white p-3 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" onClick={viewLogs}>View Email Logs</Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Email Logs</CardTitle>
                <CardDescription>
                  View logs of all emails sent from your account to diagnose issues.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTitle>Information</AlertTitle>
                  <AlertDescription>
                    Email logs can help you diagnose issues with email sending. You can see the status of each email,
                    when it was sent, and any error messages if the sending failed.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button onClick={viewLogs}>View Email Logs</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </NoSidebarLayout>
  );
};

export default EmailTroubleshooter;