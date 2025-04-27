import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Bug, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import EmailRuleDebugger from '@/components/EmailRuleDebugger';
import CreateDefaultEmailTemplate from '@/components/CreateDefaultEmailTemplate';

type Form = {
  id: string;
  name: string;
};

export default function DebugEmailRules() {
  const router = useRouter();
  const { submissionId: initialSubmissionId } = router.query;
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [debugResults, setDebugResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string>(
    typeof initialSubmissionId === 'string' ? initialSubmissionId : ''
  );
  const [searchedId, setSearchedId] = useState<string | null>(
    typeof initialSubmissionId === 'string' ? initialSubmissionId : null
  );

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await fetch('/api/forms');
      if (!response.ok) {
        throw new Error('Failed to fetch forms');
      }
      const data = await response.json();
      setForms(data);
    } catch (err) {
      console.error('Error fetching forms:', err);
      setError('Failed to load forms');
    }
  };

  const handleDebug = async (processEmails = false) => {
    if (!selectedFormId) {
      setError('Please select a form');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const url = processEmails 
        ? `/api/debug/email-rules?formId=${selectedFormId}&processEmails=true`
        : `/api/debug/email-rules?formId=${selectedFormId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to debug email rules');
      }
      
      const data = await response.json();
      setDebugResults(data);
    } catch (err) {
      console.error('Error debugging email rules:', err);
      setError('Failed to debug email rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmission = () => {
    if (!submissionId.trim()) {
      setError('Please enter a submission ID');
      return;
    }
    
    setError(null);
    setSearchedId(submissionId.trim());
    
    // Update the URL to include the submission ID for sharing/bookmarking
    router.push({
      pathname: router.pathname,
      query: { submissionId: submissionId.trim() }
    }, undefined, { shallow: true });
  };

  const handleSeedSampleData = async () => {
    if (!selectedFormId) {
      setError('Please select a form');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/debug/seed-sample-submission?formId=${selectedFormId}`);
      
      if (!response.ok) {
        throw new Error('Failed to seed sample data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh the debug results to show the updated sample data
        await handleDebug(false);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to seed sample data');
      }
    } catch (err) {
      console.error('Error seeding sample data:', err);
      setError('Failed to seed sample data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Email Rules Debugger</h1>
            <p className="text-muted-foreground">Test and debug email rules</p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Debug by Submission ID</CardTitle>
          <CardDescription>
            Enter a form submission ID to view detailed email processing logs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter submission ID"
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmission()}
              />
            </div>
            <Button onClick={handleSearchSubmission}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {searchedId && (
        <>
          <EmailRuleDebugger submissionId={searchedId} />
          <Separator className="my-6" />
        </>
      )}
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Form</CardTitle>
          <CardDescription>
            Choose a form to debug its email rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form">Form</Label>
            <Select
              value={selectedFormId}
              onValueChange={setSelectedFormId}
            >
              <SelectTrigger id="form">
                <SelectValue placeholder="Select a form" />
              </SelectTrigger>
              <SelectContent>
                {forms.map(form => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => handleDebug(false)}
              disabled={loading || !selectedFormId}
            >
              <Bug className="h-4 w-4 mr-2" />
              {loading ? 'Debugging...' : 'Debug Email Rules'}
            </Button>
            
            <Button
              onClick={() => handleDebug(true)}
              disabled={loading || !selectedFormId}
              variant="secondary"
            >
              <Bug className="h-4 w-4 mr-2" />
              Debug & Send Test Emails
            </Button>

            <Button
              onClick={handleSeedSampleData}
              disabled={loading || !selectedFormId}
              variant="outline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                <path d="M12 10V3"></path>
                <path d="M8 7l4-4 4 4"></path>
                <path d="M20 21H4a2 2 0 0 1-2-2v-5c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2Z"></path>
              </svg>
              Seed Sample Data
            </Button>
          </div>
          
          {selectedFormId && (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-sm font-medium mb-2">No Email Rules?</h3>
              <p className="text-sm text-muted-foreground mb-2">
                If you don't have any email rules set up for this form, you can create a default template and rule that will automatically send emails when users submit the form.
              </p>
              <CreateDefaultEmailTemplate 
                formId={selectedFormId} 
                formType="INQUIRY"
                onSuccess={() => handleDebug(false)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {debugResults && (
        <Tabs defaultValue="rules">
          <TabsList className="mb-4">
            <TabsTrigger value="rules">Rules ({debugResults.rules.length})</TabsTrigger>
            <TabsTrigger value="submission">Sample Submission</TabsTrigger>
            <TabsTrigger value="logs">Email Logs ({debugResults.emailLogs.length})</TabsTrigger>
            <TabsTrigger value="test">Test Results</TabsTrigger>
            {debugResults.emailProcessingResults && debugResults.emailProcessingResults.length > 0 && (
              <TabsTrigger value="processing">Processing Results</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>Email Rules</CardTitle>
                <CardDescription>
                  Active email rules for this form
                </CardDescription>
              </CardHeader>
              <CardContent>
                {debugResults.rules.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No active email rules found for this form
                  </div>
                ) : (
                  <div className="space-y-4">
                    {debugResults.rules.map((rule: any) => (
                      <div key={rule.id} className="border p-4 rounded-md">
                        <h3 className="font-medium">{rule.name}</h3>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                        <div className="mt-2">
                          <span className="text-sm font-medium">Template:</span>{' '}
                          <span className="text-sm">{rule.template.name}</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-sm font-medium">Conditions:</span>
                          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(
                              typeof rule.conditions === 'string' 
                                ? JSON.parse(rule.conditions) 
                                : rule.conditions, 
                              null, 2
                            )}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="submission">
            <Card>
              <CardHeader>
                <CardTitle>Sample Submission</CardTitle>
                <CardDescription>
                  Most recent form submission data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!debugResults.sampleSubmission ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No submissions found for this form
                  </div>
                ) : (
                  <div>
                    <div className="mb-2">
                      <span className="text-sm font-medium">Submission ID:</span>{' '}
                      <span className="text-sm">{debugResults.sampleSubmission.id}</span>
                    </div>
                    <div className="mb-2">
                      <span className="text-sm font-medium">Created:</span>{' '}
                      <span className="text-sm">
                        {new Date(debugResults.sampleSubmission.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-4">
                      <span className="text-sm font-medium">Form Data:</span>
                      <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(debugResults.sampleSubmission.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Email Logs</CardTitle>
                <CardDescription>
                  Emails sent for the sample submission
                </CardDescription>
              </CardHeader>
              <CardContent>
                {debugResults.emailLogs.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No email logs found for this submission
                  </div>
                ) : (
                  <div className="space-y-4">
                    {debugResults.emailLogs.map((log: any) => (
                      <div key={log.id} className="border p-4 rounded-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">To: {log.recipient}</h3>
                            <p className="text-sm">Subject: {log.subject}</p>
                          </div>
                          <div className="text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              log.status === 'sent' ? 'bg-green-100 text-green-800' : 
                              log.status === 'failed' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-sm font-medium">Template:</span>{' '}
                          <span className="text-sm">{log.template?.name || 'Unknown'}</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-sm font-medium">Sent:</span>{' '}
                          <span className="text-sm">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {log.error && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-red-600">Error:</span>{' '}
                            <span className="text-sm text-red-600">{log.error}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  Evaluation of email rule conditions against sample submission
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!debugResults.testConditions || debugResults.testConditions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No test results available
                  </div>
                ) : (
                  <div className="space-y-6">
                    {debugResults.testConditions.map((test: any) => (
                      <div key={test.ruleId} className="border p-4 rounded-md">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-medium">{test.ruleName}</h3>
                          <div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              test.allConditionsMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {test.allConditionsMet ? 'All Conditions Met' : 'Conditions Not Met'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {test.conditionResults.map((result: any, index: number) => (
                            <div key={index} className="bg-muted p-3 rounded-md">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm">
                                    <span className="font-medium">Field:</span> {result.condition.field}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-medium">Operator:</span> {result.condition.operator}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-medium">Expected Value:</span> {result.condition.value}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-medium">Actual Value:</span> {
                                      result.fieldValue !== undefined && result.fieldValue !== null 
                                        ? String(result.fieldValue) 
                                        : '(undefined)'
                                    }
                                  </p>
                                </div>
                                <div>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    result.result ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {result.result ? 'Passed' : 'Failed'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="processing">
            <Card>
              <CardHeader>
                <CardTitle>Email Processing Results</CardTitle>
                <CardDescription>
                  Results of processing email rules and sending test emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!debugResults.emailProcessingResults || debugResults.emailProcessingResults.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No email processing results available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {debugResults.emailProcessingResults.map((result: any, index: number) => (
                      <div key={index} className="border p-4 rounded-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{result.ruleName}</h3>
                            {result.success ? (
                              <>
                                <p className="text-sm">Recipient: {result.recipient}</p>
                                <p className="text-sm">Subject: {result.subject}</p>
                              </>
                            ) : (
                              <p className="text-sm text-red-600">Error: {result.error}</p>
                            )}
                          </div>
                          <div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {result.success ? 'Success' : 'Failed'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}