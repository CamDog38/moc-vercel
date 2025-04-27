import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TopNav } from '@/components/TopNav';

interface ExtractionResult {
  strategy: string;
  field: string | null;
  value: any;
  firstName: string;
  success: boolean;
}

export default function FirstNameExtractionDebug() {
  const [submissionId, setSubmissionId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);
  
  // Define template text as a constant to avoid JSX parsing issues with double curly braces
  const templateText = "Hello {{firstName}}, thank you for your submission!";
  const variableName = "firstName";

  // Function to test firstName extraction
  const testFirstNameExtraction = async () => {
    if (!submissionId) {
      toast({
        title: "Error",
        description: "Please enter a submission ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/debug/firstName-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ submissionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test firstName extraction');
      }

      setResults(data);

      toast({
        title: "Test Complete",
        description: data.success 
          ? `Found best firstName: ${data.bestFirstName}` 
          : "Failed to extract firstName",
      });
    } catch (error) {
      console.error('Error testing firstName extraction:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopNav />
      <div className="container mx-auto py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{variableName} Variable Extraction Debug</CardTitle>
            <CardDescription>
              Test how the {'{{' + variableName + '}}'} variable is extracted from form submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-3">
                  <Label htmlFor="submissionId">Form Submission ID</Label>
                  <Input 
                    id="submissionId"
                    value={submissionId}
                    onChange={(e) => setSubmissionId(e.target.value)}
                    placeholder="Enter a form submission ID to test"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={testFirstNameExtraction} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Testing..." : "Test Extraction"}
                  </Button>
                </div>
              </div>

              {results && (
                <div className="space-y-6 mt-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Data Structure Analysis</h3>
                    <div className="bg-secondary/20 rounded-md p-4 overflow-auto">
                      <pre className="text-xs">{JSON.stringify(results.dataStructure, null, 2)}</pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Extraction Results</h3>
                    <div className="space-y-4">
                      {results.extractionResults.map((result: ExtractionResult, index: number) => (
                        <Card key={index} className={result.success ? "border-green-500" : "border-amber-500"}>
                          <CardHeader className="py-3">
                            <CardTitle className="text-base">
                              Strategy {index + 1}: {result.strategy}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="font-medium">Field:</span> {result.field || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Value:</span> {result.value ? JSON.stringify(result.value) : 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Extracted firstName:</span> {result.firstName}
                              </div>
                              <div>
                                <span className="font-medium">Success:</span> {result.success ? "✅" : "❌"}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Variable Replacement Test</h3>
                    <Card>
                      <CardContent className="py-4">
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium">Template:</span> {templateText}
                          </div>
                          <div>
                            <span className="font-medium">Result:</span> {results.replacedTemplate}
                          </div>
                          <div>
                            <span className="font-medium">Best firstName:</span> {results.bestFirstName}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Normalized Data Keys</h3>
                    <div className="bg-secondary/20 rounded-md p-4 overflow-auto max-h-40">
                      <pre className="text-xs">{JSON.stringify(results.normalizedDataKeys, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}