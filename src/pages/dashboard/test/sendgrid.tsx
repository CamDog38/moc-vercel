import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

type ConfigStatus = {
  apiKey: boolean;
  fromEmail: boolean;
  testEmailSent?: boolean;
};

export default function TestSendGrid() {
  const [loading, setLoading] = useState(false);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const checkSendGridConfig = async (sendTest: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      setTestResult(null);

      const payload: any = {};
      if (sendTest && testEmail) {
        payload.sendTestEmail = true;
        payload.testRecipient = testEmail;
      }

      const response = await fetch('/api/test/sendgrid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check SendGrid configuration');
      }

      setConfigStatus(data.configStatus);
      
      if (sendTest && data.configStatus.testEmailSent) {
        setTestResult('Test email sent successfully!');
        toast({
          title: "Success",
          description: `Test email sent to ${testEmail}`,
        });
      }
    } catch (err) {
      console.error('Error checking SendGrid:', err);
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">SendGrid Integration Test</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>SendGrid Configuration Status</CardTitle>
            <CardDescription>
              Check if your SendGrid API is properly configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {configStatus && (
              <div className="space-y-4">
                <div className="flex items-center">
                  {configStatus.apiKey ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  )}
                  <span>
                    SendGrid API Key: {configStatus.apiKey ? 'Configured' : 'Not Configured'}
                  </span>
                </div>

                <div className="flex items-center">
                  {configStatus.fromEmail ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  )}
                  <span>
                    Sender Email: {configStatus.fromEmail ? 'Configured' : 'Not Configured'}
                  </span>
                </div>

                {configStatus.testEmailSent !== undefined && (
                  <div className="flex items-center">
                    {configStatus.testEmailSent ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    )}
                    <span>
                      Test Email: {configStatus.testEmailSent ? 'Sent Successfully' : 'Failed to Send'}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
              <Button 
                onClick={() => checkSendGridConfig(false)} 
                disabled={loading}
              >
                {loading ? 'Checking...' : 'Check Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send Test Email</CardTitle>
            <CardDescription>
              Send a test email to verify your SendGrid integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testEmail">Recipient Email</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="Enter recipient email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>

              {testResult && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700">{testResult}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => checkSendGridConfig(true)} 
              disabled={loading || !testEmail}
            >
              {loading ? 'Sending...' : 'Send Test Email'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
