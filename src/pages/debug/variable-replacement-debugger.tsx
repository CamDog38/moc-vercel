import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function VariableReplacementDebugger() {
  const { toast } = useToast();
  
  const [template, setTemplate] = useState('Hello {"{{"}}firstName{"}}"}}, welcome to our service!');
  const [variables, setVariables] = useState(JSON.stringify({
    "name": "John Doe",
    "email": "john@example.com"
  }, null, 2));
  
  const [results, setResults] = useState<{
    analysis: Array<{
      variableName: string;
      exists: boolean;
      value: string | null;
      whitespaceIssue: boolean;
      isConditional?: boolean;
      source?: string;
    }>;
    replacedTemplate: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  
  const testReplacement = async () => {
    try {
      // Validate JSON
      const parsedVariables = JSON.parse(variables);
      
      setLoading(true);
      
      const response = await fetch('/api/debug/variable-replacement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template,
          variables: parsedVariables,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'An error occurred');
      }
      
      setResults(data);
      
      toast({
        title: 'Variable replacement test complete',
        description: 'Check the results below',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to test variable replacement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Variable Replacement Debugger</h1>
      <p className="text-muted-foreground mb-6">Test variable replacement in templates to diagnose issues with the name variable or other variables.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Template with Variables</CardTitle>
              <CardDescription>
                Enter a template with variables in double curly braces: &#123;&#123;variable_name&#125;&#125;
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="min-h-[100px] font-mono"
              />
              <p className="text-xs text-muted-foreground mt-2">Use double curly braces for variables: &#123;&#123;variable_name&#125;&#125;</p>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Variables (JSON format)</CardTitle>
              <CardDescription>
                Enter the variables as a JSON object
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                className="min-h-[150px] font-mono"
              />
              <p className="text-xs text-muted-foreground mt-2">Enter variables in JSON format</p>
              
              <Button 
                onClick={testReplacement} 
                className="w-full mt-4"
                disabled={loading}
              >
                {loading ? 'Testing...' : 'Test Variable Replacement'}
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div>
          {results && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Variable Analysis</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Variable</TableHead>
                          <TableHead>Exists</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Whitespace Issue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.analysis.filter(v => !v.isConditional).map((variable, index) => (
                          <TableRow key={index}>
                            <TableCell>{variable.variableName}</TableCell>
                            <TableCell>
                              {variable.exists ? (
                                <span className="text-green-500 font-bold">✓</span>
                              ) : (
                                <span className="text-red-500">✗</span>
                              )}
                            </TableCell>
                            <TableCell>{variable.value || '–'}</TableCell>
                            <TableCell>
                              {variable.whitespaceIssue ? (
                                <span className="text-red-500">✗</span>
                              ) : (
                                <span className="text-green-500">✓</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {results.analysis.some(v => v.source) && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>Sources: {results.analysis
                          .filter(v => v.source && !v.isConditional)
                          .map(v => `${v.variableName} (${v.source})`)
                          .join(', ')}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Replaced Template</h3>
                    <div className="p-4 border rounded-md bg-muted">
                      {results.replacedTemplate}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}