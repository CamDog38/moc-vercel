import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface EmailRuleTestSubmissionProps {
  ruleId: string;
  formId?: string;
  onTestComplete?: (result: any) => void;
}

export default function EmailRuleTestSubmission({
  ruleId,
  formId,
  onTestComplete
}: EmailRuleTestSubmissionProps) {
  const [formData, setFormData] = useState<Record<string, string>>({
    email: '',
    name: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/debug/email-recipient-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleId,
          formId,
          testData: formData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process test submission');
      }

      const data = await response.json();
      setResult(data);
      
      if (onTestComplete) {
        onTestComplete(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Email Recipient Resolution</CardTitle>
        <CardDescription>
          Submit test data to see how the email recipient is determined
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Test Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="test@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be used as the submitter's email address
              </p>
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Test Name
              </label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1">
                Test Message
              </label>
              <Textarea
                id="message"
                name="message"
                placeholder="Enter a test message"
                value={formData.message}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
          </div>
          
          <Button type="submit" className="mt-4 w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Recipient Resolution'
            )}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      {result && (
        <CardFooter className="flex flex-col items-start">
          <div className="w-full">
            <h3 className="text-lg font-medium mb-2">Test Results</h3>
            
            <div className="space-y-4">
              <div className="p-3 border rounded-md">
                <div className="font-medium">Recipient Resolution</div>
                <div className="flex items-center mt-1">
                  <div className="font-bold mr-2">Final Recipient:</div>
                  <div className="text-blue-600 dark:text-blue-400">
                    {result.resolvedRecipient || 'Not resolved'}
                  </div>
                </div>
                
                {result.recipientSource && (
                  <div className="flex items-center mt-1">
                    <div className="font-bold mr-2">Source:</div>
                    <div>{result.recipientSource}</div>
                  </div>
                )}
                
                {result.originalRecipient && result.resolvedRecipient !== result.originalRecipient && (
                  <Alert className="mt-2 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Recipient Changed</AlertTitle>
                    <AlertDescription>
                      The original recipient ({result.originalRecipient}) was changed to {result.resolvedRecipient}
                    </AlertDescription>
                  </Alert>
                )}
                
                {result.isSubmitterEmail && (
                  <Alert className="mt-2 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Using Submitter Email</AlertTitle>
                    <AlertDescription>
                      The email is being sent to the form submitter's email address ({formData.email})
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              {result.issues && result.issues.length > 0 && (
                <div className="p-3 border rounded-md border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
                  <div className="font-medium text-red-800 dark:text-red-300">Issues Detected</div>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {result.issues.map((issue: string, index: number) => (
                      <li key={index} className="text-red-700 dark:text-red-300 text-sm">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="p-3 border rounded-md border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20">
                  <div className="font-medium text-blue-800 dark:text-blue-300">Recommendations</div>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {result.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-blue-700 dark:text-blue-300 text-sm">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {(!result.issues || result.issues.length === 0) && (
                <Alert className="bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Recipient Resolution Successful</AlertTitle>
                  <AlertDescription>
                    The email recipient was successfully resolved to {result.resolvedRecipient}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}