import { useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function VariableDiagnosisPage() {
  const router = useRouter();
  const [submissionId, setSubmissionId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const runDiagnostics = async () => {
    if (!submissionId) {
      setError('Submission ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/debug/email-variable-diagnosis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId,
          templateId: templateId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An error occurred');
      }

      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Email Variable Diagnosis</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Diagnose Email Variable Replacement Issues</CardTitle>
            <CardDescription>
              Enter a form submission ID to analyze variable replacement in email templates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="submissionId">Form Submission ID (required)</Label>
                  <Input
                    id="submissionId"
                    value={submissionId}
                    onChange={(e) => setSubmissionId(e.target.value)}
                    placeholder="e.g., cm94snnw50003bi9vwfe52lno"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateId">Email Template ID (optional)</Label>
                  <Input
                    id="templateId"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    placeholder="Leave empty to use most recent template"
                  />
                </div>
              </div>
              <Button onClick={runDiagnostics} disabled={loading}>
                {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Diagnostic Summary</CardTitle>
                <CardDescription>
                  Analysis of variable replacement for submission {results.submission.id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Variables Found</div>
                    <div className="text-2xl font-bold">
                      {results.variableAnalysis.found} / {results.variableAnalysis.total}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Missing Variables</div>
                    <div className="text-2xl font-bold">
                      {results.variableAnalysis.notFound}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Replacement Status</div>
                    <div>
                      {results.replacementResults.subjectFullyProcessed && 
                       results.replacementResults.bodyFullyProcessed ? (
                        <Badge className="bg-green-500">All Variables Replaced</Badge>
                      ) : (
                        <Badge variant="destructive">Incomplete Replacement</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="submission">
                  <TabsList className="grid grid-cols-4 mb-4">
                    <TabsTrigger value="submission">Submission</TabsTrigger>
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                    <TabsTrigger value="replacement">Replacement</TabsTrigger>
                    <TabsTrigger value="data">Data Structure</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="submission" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-lg font-medium mb-2">Submission Details</h3>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="font-medium">ID:</div>
                            <div className="col-span-2">{results.submission.id}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="font-medium">Form ID:</div>
                            <div className="col-span-2">{results.submission.formId}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="font-medium">Lead ID:</div>
                            <div className="col-span-2">{results.submission.leadId || 'N/A'}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="font-medium">Booking ID:</div>
                            <div className="col-span-2">{results.submission.bookingId || 'N/A'}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="font-medium">Created At:</div>
                            <div className="col-span-2">{new Date(results.submission.createdAt).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium mb-2">Critical Fields</h3>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="font-medium">timeStamp:</div>
                            <div className="col-span-2">
                              {results.submission.timeStamp ? (
                                <Badge className="bg-green-500">{results.submission.timeStamp}</Badge>
                              ) : (
                                <Badge variant="destructive">Missing</Badge>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="font-medium">trackingToken:</div>
                            <div className="col-span-2">
                              {results.submission.trackingToken ? (
                                <div className="space-y-2">
                                  <Badge className="bg-green-500">{results.submission.trackingToken}</Badge>
                                  {results.submission.trackingTokenDetails && (
                                    <div className="text-xs space-y-1 mt-1">
                                      <div>Format: {results.submission.trackingTokenDetails.format}</div>
                                      <div>Parts: {results.submission.trackingTokenDetails.parts.length}</div>
                                      <div>Length: {results.submission.trackingTokenDetails.length} characters</div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="destructive">Missing</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Template Information</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="font-medium">Template:</div>
                        <div className="col-span-2">{results.template.name} ({results.template.id})</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="font-medium">Type:</div>
                        <div className="col-span-2">{results.template.type}</div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="variables" className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium">Variable Analysis</h3>
                      <div className="text-sm text-muted-foreground">
                        {results.variableAnalysis.found} of {results.variableAnalysis.total} variables found
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[400px] border rounded-md p-4">
                      <div className="space-y-4">
                        {results.variableAnalysis.details.map((detail: any, index: number) => (
                          <div key={index} className="p-3 border rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-medium">&#123;&#123;{detail.variable}&#125;&#125;</div>
                              {detail.isConditional ? (
                                <Badge variant="outline">Conditional</Badge>
                              ) : detail.exists ? (
                                <Badge className="bg-green-500">Found</Badge>
                              ) : (
                                <Badge variant="destructive">Not Found</Badge>
                              )}
                            </div>
                            
                            {!detail.isConditional && (
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div className="text-muted-foreground">Source:</div>
                                <div className="col-span-2">{detail.source}</div>
                                
                                {detail.exists && (
                                  <>
                                    <div className="text-muted-foreground">Value:</div>
                                    <div className="col-span-2 break-all">
                                      {detail.value && detail.value.length > 100 
                                        ? `${detail.value.substring(0, 100)}...` 
                                        : detail.value}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="replacement" className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Replacement Results</h3>
                      
                      <div className="mb-4">
                        <div className="font-medium mb-1">Subject Before:</div>
                        <div className="p-3 border rounded-md bg-muted">
                          {results.replacementResults.subjectBefore}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="font-medium mb-1">Subject After:</div>
                        <div className="p-3 border rounded-md bg-muted">
                          {results.replacementResults.subjectAfter}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="font-medium mb-1">Body Content:</div>
                        <div className="p-3 border rounded-md">
                          <div>Original length: {results.replacementResults.bodyBeforeLength} characters</div>
                          <div>Processed length: {results.replacementResults.bodyAfterLength} characters</div>
                        </div>
                      </div>
                      
                      {results.replacementResults.unreplacedVariables.length > 0 && (
                        <div className="mb-4">
                          <div className="font-medium mb-1">Unreplaced Variables:</div>
                          <div className="p-3 border rounded-md bg-muted">
                            {results.replacementResults.unreplacedVariables.map((variable: string, index: number) => (
                              <Badge key={index} variant="outline" className="mr-2 mb-2">
                                &#123;&#123;{variable}&#125;&#125;
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="data" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium mb-2">Top Level Keys</h3>
                        <ScrollArea className="h-[300px] border rounded-md p-4">
                          <div className="space-y-1">
                            {results.dataStructure.topLevelKeys.map((key: string, index: number) => (
                              <div key={index} className="p-2 border-b last:border-0">
                                {key}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-2">Form Data Keys</h3>
                        <ScrollArea className="h-[300px] border rounded-md p-4">
                          <div className="space-y-1">
                            {results.dataStructure.formDataKeys.length > 0 ? (
                              results.dataStructure.formDataKeys.map((key: string, index: number) => (
                                <div key={index} className="p-2 border-b last:border-0">
                                  {key}
                                </div>
                              ))
                            ) : (
                              <div className="p-2 text-muted-foreground">No form data keys available</div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Critical Fields Status</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg text-center">
                          <div className="text-sm text-muted-foreground mb-2">timeStamp</div>
                          {results.dataStructure.hasTimeStamp ? (
                            <Badge className="bg-green-500">Available</Badge>
                          ) : (
                            <Badge variant="destructive">Missing</Badge>
                          )}
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <div className="text-sm text-muted-foreground mb-2">trackingToken</div>
                          {results.dataStructure.hasTrackingToken ? (
                            <Badge className="bg-green-500">Available</Badge>
                          ) : (
                            <Badge variant="destructive">Missing</Badge>
                          )}
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <div className="text-sm text-muted-foreground mb-2">leadId</div>
                          {results.dataStructure.hasLeadId ? (
                            <Badge className="bg-green-500">Available</Badge>
                          ) : (
                            <Badge variant="destructive">Missing</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}