import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import EmailRuleMappingVisualizer from '@/components/EmailRuleMappingVisualizer';
import EmailRuleTestSubmission from '@/components/EmailRuleTestSubmission';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

interface EmailRule {
  id: string;
  name: string;
  recipientType: string;
  recipientEmail?: string;
  recipientField?: string | null;
  ccEmails?: string | null;
  bccEmails?: string | null;
  formId?: string | null;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  mapping: string | null;
}

interface Form {
  id: string;
  name: string;
  fields: FormField[];
}

interface EmailTemplate {
  id: string;
  name: string;
  ccEmails?: string;
  bccEmails?: string;
}

interface RuleMappingData {
  rule: EmailRule;
  form?: Form;
  template: EmailTemplate;
  analysis?: {
    recipientSource: string;
    recipientValue: string;
    hasCc: boolean;
    hasBcc: boolean;
    potentialIssues: string[];
    mappingIssues: any[];
  };
}

export default function EmailRuleMappingsPage() {
  const router = useRouter();
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [mappingData, setMappingData] = useState<RuleMappingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  // Fetch all email rules and handle ruleId from query params
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await fetch('/api/emails/rules');
        if (!response.ok) throw new Error('Failed to fetch email rules');
        const data = await response.json();
        setRules(data);
        
        // Check if we have a ruleId in the query params
        const { ruleId } = router.query;
        if (ruleId && typeof ruleId === 'string') {
          setSelectedRuleId(ruleId);
        } else if (data.length > 0 && !selectedRuleId) {
          setSelectedRuleId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred fetching rules');
      }
    };

    fetchRules();
  }, [router.query]);

  // Fetch mapping data for selected rule
  useEffect(() => {
    if (!selectedRuleId) return;

    const fetchMappingData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/debug/email-recipient-test?ruleId=${selectedRuleId}`);
        if (!response.ok) throw new Error('Failed to fetch mapping data');
        const data = await response.json();
        setMappingData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred fetching mapping data');
      } finally {
        setLoading(false);
      }
    };

    fetchMappingData();
  }, [selectedRuleId]);

  const getFieldMappingStatus = (mapping: string | null) => {
    if (!mapping) return 'unmapped';
    return 'mapped';
  };

  const getRecipientTypeDisplay = (type: string) => {
    switch (type.toLowerCase()) {
      case 'custom':
        return 'Custom Email';
      case 'field':
        return 'Form Field';
      case 'submitter':
        return 'Form Submitter';
      default:
        return type;
    }
  };

  const handleTestComplete = (result: any) => {
    setTestResult(result);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Email Rule Mappings</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Email Rule</CardTitle>
            <CardDescription>
              View mapping details for a specific email notification rule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Select an email rule" />
              </SelectTrigger>
              <SelectContent>
                {rules.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id}>
                    {rule.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && <p className="text-center py-4">Loading mapping data...</p>}

        {mappingData && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="fields">Form Fields</TabsTrigger>
              <TabsTrigger value="test">Test Submission</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="raw">Raw Data</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Rule Configuration</CardTitle>
                  <CardDescription>
                    Basic information about the email notification rule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Rule Details</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">Name:</span> {mappingData.rule.name}
                        </div>
                        <div>
                          <span className="font-medium">Recipient Type:</span>{' '}
                          {getRecipientTypeDisplay(mappingData.rule.recipientType)}
                        </div>
                        {mappingData.rule.recipientType.toLowerCase() === 'custom' && (
                          <div>
                            <span className="font-medium">Recipient Email:</span>{' '}
                            {mappingData.rule.recipientEmail}
                          </div>
                        )}
                        {mappingData.rule.recipientType.toLowerCase() === 'field' && (
                          <div>
                            <span className="font-medium">Recipient Field:</span>{' '}
                            {mappingData.rule.recipientField || 'Not set'}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">CC Emails:</span>{' '}
                          {mappingData.rule.ccEmails || 'None'}
                        </div>
                        <div>
                          <span className="font-medium">BCC Emails:</span>{' '}
                          {mappingData.rule.bccEmails || 'None'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-2">Template Details</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">Template Name:</span>{' '}
                          {mappingData.template.name}
                        </div>
                        <div>
                          <span className="font-medium">Template CC:</span>{' '}
                          {mappingData.template.ccEmails || 'None'}
                        </div>
                        <div>
                          <span className="font-medium">Template BCC:</span>{' '}
                          {mappingData.template.bccEmails || 'None'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {mappingData.form && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-2">Associated Form</h3>
                      <div>
                        <span className="font-medium">Form Name:</span> {mappingData.form.name}
                      </div>
                      <div className="mt-2">
                        <span className="font-medium">Mapped Fields:</span>{' '}
                        {mappingData.form.fields.filter((f) => f.mapping).length} of{' '}
                        {mappingData.form.fields.length}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fields">
              <div className="space-y-6">
                {mappingData.form ? (
                  <>
                    <EmailRuleMappingVisualizer 
                      fields={mappingData.form.fields}
                      recipientType={mappingData.rule.recipientType}
                      recipientField={mappingData.rule.recipientField}
                    />
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Form Fields & Mappings</CardTitle>
                        <CardDescription>
                          View all form fields and their mappings for this email rule
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Field Label</TableHead>
                              <TableHead>Field Type</TableHead>
                              <TableHead>Mapping</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mappingData.form.fields.map((field) => (
                              <TableRow key={field.id}>
                                <TableCell>{field.label}</TableCell>
                                <TableCell>{field.type}</TableCell>
                                <TableCell>
                                  {field.mapping || (
                                    <span className="text-muted-foreground italic">Not mapped</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {field.mapping ? (
                                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                      Mapped
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                      Unmapped
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Alert>
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>No form associated</AlertTitle>
                    <AlertDescription>
                      This email rule does not have an associated form.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="test">
              <div className="space-y-6">
                <EmailRuleTestSubmission 
                  ruleId={selectedRuleId} 
                  formId={mappingData.form?.id} 
                  onTestComplete={handleTestComplete}
                />

                {testResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Test Result Summary</CardTitle>
                      <CardDescription>
                        Summary of the recipient resolution test
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 border rounded-md">
                          <h3 className="text-lg font-medium mb-2">Recipient Resolution</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="font-medium">Rule Configuration</div>
                              <div className="mt-1 space-y-1">
                                <div>
                                  <span className="font-bold">Rule Type:</span>{' '}
                                  {getRecipientTypeDisplay(mappingData.rule.recipientType)}
                                </div>
                                {mappingData.rule.recipientType.toLowerCase() === 'custom' && (
                                  <div>
                                    <span className="font-bold">Defined Email:</span>{' '}
                                    {mappingData.rule.recipientEmail || 'Not set'}
                                  </div>
                                )}
                                {mappingData.rule.recipientType.toLowerCase() === 'field' && (
                                  <div>
                                    <span className="font-bold">Field ID:</span>{' '}
                                    {mappingData.rule.recipientField || 'Not set'}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">Test Result</div>
                              <div className="mt-1 space-y-1">
                                <div>
                                  <span className="font-bold">Final Recipient:</span>{' '}
                                  <span className="text-blue-600 dark:text-blue-400">
                                    {testResult.resolvedRecipient}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-bold">Source:</span>{' '}
                                  {testResult.recipientSource}
                                </div>
                                <div>
                                  <span className="font-bold">Using Submitter Email:</span>{' '}
                                  {testResult.isSubmitterEmail ? 'Yes' : 'No'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {testResult.isSubmitterEmail && (
                          <Alert className="bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Email Sent to Submitter</AlertTitle>
                            <AlertDescription>
                              <p>The email is being sent to the form submitter's email address instead of a custom recipient.</p>
                              {testResult.issues && testResult.issues.length > 0 && (
                                <div className="mt-2">
                                  <strong>Reason:</strong>
                                  <ul className="list-disc pl-5 mt-1">
                                    {testResult.issues.map((issue: string, i: number) => (
                                      <li key={i}>{issue}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}

                        {testResult.recommendations && testResult.recommendations.length > 0 && (
                          <div className="p-4 border rounded-md border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20">
                            <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Recommendations</h3>
                            <ul className="list-disc pl-5 space-y-1">
                              {testResult.recommendations.map((rec: string, i: number) => (
                                <li key={i} className="text-blue-700 dark:text-blue-300">{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analysis">
              <Card>
                <CardHeader>
                  <CardTitle>Recipient Analysis</CardTitle>
                  <CardDescription>
                    Analysis of recipient configuration and potential issues
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mappingData.analysis ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium mb-2">Recipient Configuration</h3>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium">Recipient Source:</span>{' '}
                            {mappingData.analysis.recipientSource}
                          </div>
                          <div>
                            <span className="font-medium">Recipient Value:</span>{' '}
                            {mappingData.analysis.recipientValue}
                          </div>
                          <div>
                            <span className="font-medium">Has CC:</span>{' '}
                            {mappingData.analysis.hasCc ? 'Yes' : 'No'}
                          </div>
                          <div>
                            <span className="font-medium">Has BCC:</span>{' '}
                            {mappingData.analysis.hasBcc ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </div>

                      {mappingData.analysis.potentialIssues.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium mb-2">Potential Issues</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            {mappingData.analysis.potentialIssues.map((issue, index) => (
                              <li key={index} className="text-amber-600 dark:text-amber-400">
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {mappingData.analysis.mappingIssues.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium mb-2">Mapping Issues</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            {mappingData.analysis.mappingIssues.map((issue, index) => (
                              <li key={index} className="text-red-600 dark:text-red-400">
                                {issue.message || JSON.stringify(issue)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {mappingData.analysis.potentialIssues.length === 0 && 
                       mappingData.analysis.mappingIssues.length === 0 && (
                        <Alert className="bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100">
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertTitle>No Issues Detected</AlertTitle>
                          <AlertDescription>
                            The email rule configuration appears to be valid.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <InfoIcon className="h-4 w-4" />
                      <AlertTitle>No analysis available</AlertTitle>
                      <AlertDescription>
                        Analysis data is not available for this rule.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="raw">
              <Card>
                <CardHeader>
                  <CardTitle>Raw Data</CardTitle>
                  <CardDescription>
                    Raw JSON data for debugging purposes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto max-h-[500px]">
                    {JSON.stringify(mappingData, null, 2)}
                  </pre>
                  
                  {testResult && (
                    <div className="mt-4">
                      <h3 className="text-lg font-medium mb-2">Test Result Data</h3>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto max-h-[500px]">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}