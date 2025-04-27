import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertCircle, Info, Mail } from 'lucide-react';

interface EmailLog {
  id: string;
  status: string;
  recipient: string;
  subject: string;
  templateName?: string;
  error?: string;
  createdAt: string;
  cc?: string[];
  bcc?: string[];
}

interface ConditionResult {
  result: boolean;
  description: string;
  details?: {
    field?: string;
    operator?: string;
    expectedValue?: any;
    actualValue?: any;
    error?: string;
  };
}

interface RuleEvaluation {
  id: string;
  ruleId: string;
  matched: boolean;
  conditionResults?: ConditionResult[];
  error?: string;
  createdAt: string;
}

interface Rule {
  id: string;
  name: string;
  template?: {
    name: string;
  };
}

interface FormSubmission {
  formName: string;
  createdAt: string;
}

interface EmailDebugData {
  logs: EmailLog[];
  ruleEvaluations: RuleEvaluation[];
  rules: Rule[];
  submission?: FormSubmission;
}

interface EmailRuleDebuggerProps {
  submissionId: string;
}

export default function EmailRuleDebugger({ submissionId }: EmailRuleDebuggerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmailDebugData | null>(null);

  useEffect(() => {
    // If submissionId is missing, empty, or undefined, show an error and don't make the API call
    if (!submissionId) {
      setError('Missing submission ID');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/emails/submission-logs?submissionId=${submissionId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorData.error || `Error fetching email logs: ${response.statusText}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching email logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [submissionId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Processing Logs</CardTitle>
          <CardDescription>Loading email processing information...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load email processing logs: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>
          No email processing data is available for this submission.
        </AlertDescription>
      </Alert>
    );
  }

  const { logs = [], ruleEvaluations = [], rules = [], submission } = data;
  const isAuthenticated = !!rules.length; // If rules are present, user is authenticated

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Processing Logs
        </CardTitle>
        <CardDescription>
          Detailed information about email processing for submission ID: {submissionId}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            {isAuthenticated && (
              <TabsTrigger value="rules">Rule Evaluations ({ruleEvaluations.length})</TabsTrigger>
            )}
            <TabsTrigger value="logs">Email Logs ({logs.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary">
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Form Submission Summary</AlertTitle>
                <AlertDescription>
                  <div className="mt-2">
                    <p><strong>Form:</strong> {submission?.formName}</p>
                    <p><strong>Submitted:</strong> {new Date(submission?.createdAt).toLocaleString()}</p>
                    <p><strong>Emails Sent:</strong> {logs.filter(log => log.status === 'sent').length}</p>
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isAuthenticated && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Rule Evaluation Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {ruleEvaluations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No rule evaluations found</p>
                      ) : (
                        <div className="space-y-2">
                          {ruleEvaluations.map((evaluation) => {
                            const rule = rules.find(r => r.id === evaluation.ruleId);
                            return (
                              <div key={evaluation.id} className="flex items-center gap-2">
                                {evaluation.matched ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-sm">
                                  {rule?.name || evaluation.ruleId}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                <Card className={isAuthenticated ? "" : "col-span-2"}>
                  <CardHeader>
                    <CardTitle className="text-base">Email Delivery Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {logs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No emails were sent</p>
                    ) : (
                      <div className="space-y-2">
                        {logs.map((log) => (
                          <div key={log.id} className="flex items-center gap-2">
                            {log.status === 'sent' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm">
                              {log.templateName || 'Unknown template'} to {log.recipient}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {isAuthenticated && (
            <TabsContent value="rules">
              {ruleEvaluations.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Rule Evaluations</AlertTitle>
                  <AlertDescription>
                    No email rules were evaluated for this submission.
                  </AlertDescription>
                </Alert>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {ruleEvaluations.map((evaluation) => {
                    const rule = rules.find(r => r.id === evaluation.ruleId);
                    return (
                      <AccordionItem key={evaluation.id} value={evaluation.id}>
                        <AccordionTrigger className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            {evaluation.matched ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" /> Matched
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <XCircle className="h-3 w-3 mr-1" /> Not Matched
                              </Badge>
                            )}
                            <span>{rule?.name || evaluation.ruleId}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pl-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Rule Details</h4>
                              <div className="text-sm space-y-1">
                                <p><strong>Rule ID:</strong> {evaluation.ruleId}</p>
                                <p><strong>Template:</strong> {rule?.template?.name || 'Unknown'}</p>
                                <p><strong>Evaluated At:</strong> {new Date(evaluation.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <h4 className="text-sm font-medium mb-2">Condition Results</h4>
                              {evaluation.conditionResults && Array.isArray(evaluation.conditionResults) ? (
                                <div className="space-y-2">
                                  {evaluation.conditionResults.map((condition, index) => (
                                    <div key={index} className="border rounded-md p-2">
                                      <div className="flex items-center gap-2">
                                        {condition.result ? (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                        <span className="text-sm font-medium">{condition.description}</span>
                                      </div>
                                      {condition.details && (
                                        <div className="mt-2 text-xs text-muted-foreground pl-6">
                                          {condition.details.field && (
                                            <p><strong>Field:</strong> {condition.details.field}</p>
                                          )}
                                          {condition.details.operator && (
                                            <p><strong>Operator:</strong> {condition.details.operator}</p>
                                          )}
                                          {condition.details.expectedValue !== undefined && (
                                            <p><strong>Expected:</strong> {String(condition.details.expectedValue)}</p>
                                          )}
                                          {condition.details.actualValue !== undefined && (
                                            <p><strong>Actual:</strong> {String(condition.details.actualValue)}</p>
                                          )}
                                          {condition.details.error && (
                                            <p className="text-red-500"><strong>Error:</strong> {condition.details.error}</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No condition details available</p>
                              )}
                            </div>
                            
                            {evaluation.error && (
                              <>
                                <Separator />
                                <div>
                                  <h4 className="text-sm font-medium mb-2 text-red-500">Error</h4>
                                  <p className="text-sm text-red-500">{evaluation.error}</p>
                                </div>
                              </>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </TabsContent>
          )}
          
          <TabsContent value="logs">
            {logs.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Email Logs</AlertTitle>
                <AlertDescription>
                  No emails were sent for this submission.
                </AlertDescription>
              </Alert>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {logs.map((log) => (
                  <AccordionItem key={log.id} value={log.id}>
                    <AccordionTrigger className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        {log.status === 'sent' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" /> Sent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" /> Failed
                          </Badge>
                        )}
                        <span>{log.templateName || 'Unknown template'}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pl-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Email Details</h4>
                          <div className="text-sm space-y-1">
                            <p><strong>Recipient:</strong> {log.recipient}</p>
                            <p><strong>Subject:</strong> {log.subject}</p>
                            <p><strong>Template:</strong> {log.templateName || 'Unknown'}</p>
                            <p><strong>Status:</strong> {log.status}</p>
                            <p><strong>Sent At:</strong> {new Date(log.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        
                        {log.error && (
                          <>
                            <Separator />
                            <div>
                              <h4 className="text-sm font-medium mb-2 text-red-500">Error</h4>
                              <p className="text-sm text-red-500">{log.error}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}