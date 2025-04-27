import { useState, useEffect } from 'react';
import { TopNav } from '@/components/TopNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { createClient } from '@/util/supabase/component';

interface FormSection {
  title?: string;
  fields?: Array<{
    id: string;
    mapping?: string;
  }>;
}

interface FormData {
  id: string;
  name: string;
  fields: any[];
  sections: FormSection[];
}

interface EmailRule {
  id: string;
  name: string;
  conditions: string;
  template: {
    id: string;
    name: string;
  };
}

interface FormSubmission {
  id: string;
  data: Record<string, any>;
}

interface ConditionResult {
  condition: {
    field: string;
    operator: string;
    value: string;
  };
  fieldValue: any;
  result: boolean;
  stringComparison?: {
    fieldValueString: string;
    valueString: string;
    equal: boolean;
  };
  error?: string;
}

export default function EmailRulesDebug() {
  const [forms, setForms] = useState<FormData[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [emailRules, setEmailRules] = useState<EmailRule[]>([]);
  const [sampleSubmission, setSampleSubmission] = useState<FormSubmission | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formsLoading, setFormsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch forms on mount
  useEffect(() => {
    fetchForms();
  }, []);

  // Fetch forms
  const fetchForms = async () => {
    setFormsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('No active session found - please log in');
        return;
      }
      
      const response = await fetch('/api/forms', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      // API returns forms directly as an array
      setForms(data);
    } catch (error) {
      console.error('Error fetching forms:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch forms');
    } finally {
      setFormsLoading(false);
    }
  };

  // Fetch email rules and test results when form is selected
  const fetchEmailRules = async (formId: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/debug/email-rules?formId=${formId}&processEmails=false`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch email rules');
      }
      setEmailRules(data.rules || []);
      setSampleSubmission(data.sampleSubmission);
      setTestResults(data.testConditions || []);
    } catch (error) {
      console.error('Error fetching email rules:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch email rules');
    }
    setLoading(false);
  };

  // Handle form selection
  const handleFormSelect = (formId: string) => {
    setSelectedFormId(formId);
    if (formId) {
      fetchEmailRules(formId);
    }
  };

  // Format condition for display
  const formatCondition = (condition: any) => {
    if (!condition) return 'Invalid condition';
    return `${condition.field} ${condition.operator} "${condition.value}"`;
  };

  // Render condition result with detailed comparison
  const renderConditionResult = (result: ConditionResult) => {
    if (result.error) {
      return (
        <div className="text-red-500">
          Error: {result.error}
        </div>
      );
    }

    return (
      <div className={`p-4 rounded ${result.result ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="font-medium">
          {formatCondition(result.condition)}
        </div>
        <div className="mt-2 text-sm">
          <div>Field value: "{result.fieldValue}"</div>
          <div>Expected value: "{result.condition.value}"</div>
          {result.stringComparison && (
            <div className="mt-1 text-xs text-gray-600">
              String comparison:
              <div>Field value: "{result.stringComparison.fieldValueString}"</div>
              <div>Expected: "{result.stringComparison.valueString}"</div>
              <div>Exact match: {result.stringComparison.equal ? 'Yes' : 'No'}</div>
            </div>
          )}
        </div>
        <div className={`mt-2 font-medium ${result.result ? 'text-green-600' : 'text-red-600'}`}>
          Result: {result.result ? 'Matched' : 'Not matched'}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Email Rules Debug</h1>
        
        {/* Form Selection */}
        <Card className="p-6 mb-6">
          <Label htmlFor="formSelect">Select Form</Label>
          {error ? (
            <div className="text-red-500 mt-2">{error}</div>
          ) : formsLoading ? (
            <div className="text-gray-500 mt-2">Loading forms...</div>
          ) : (
            <Select value={selectedFormId} onValueChange={handleFormSelect}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Select a form..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </Card>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : selectedFormId ? (
          <>
            {/* Form Data */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Form Data</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Form Fields</h3>
                  <div className="bg-yellow-50 p-4 rounded mb-4">
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>Important:</strong> Email rules require an "email" field in the form data.
                      Check that one of your fields is mapped to "email".
                    </p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded">
                    {forms.find(f => f.id === selectedFormId)?.sections?.map((section: FormSection, i: number) => (
                      <div key={i} className="mb-4">
                        <h4 className="font-medium">{section.title || 'Untitled Section'}</h4>
                        <div className="ml-4">
                          {section.fields?.map((field: { id: string; mapping?: string }, j: number) => (
                            <div key={j} className="text-sm">
                              <span className={`font-mono ${field.mapping === 'email' ? 'text-green-600 font-bold' : ''}`}>
                                {field.id}
                              </span>
                              {field.mapping && (
                                <span className="text-gray-500 ml-2">
                                  → mapped to "{field.mapping}"
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Raw Form Data</h3>
                  <div className="bg-gray-100 p-4 rounded">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(forms.find(f => f.id === selectedFormId), null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </Card>

            {/* Sample Submission */}
            {sampleSubmission && (
              <Card className="p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Latest Form Submission</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Available Fields</h3>
                    <div className="bg-gray-100 p-4 rounded">
                      {Object.entries(sampleSubmission.data).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className={`font-mono ${key === 'email' ? 'text-green-600 font-bold' : ''}`}>
                            {key}
                          </span>
                          : {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Raw Submission Data</h3>
                    <div className="bg-gray-100 p-4 rounded">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(sampleSubmission.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Email Rules */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Email Rules</h2>
              {emailRules.length === 0 ? (
                <div className="text-gray-500">No email rules found for this form.</div>
              ) : (
                emailRules.map((rule, ruleIndex) => (
                  <div key={rule.id} className="mb-8 last:mb-0">
                    <h3 className="text-lg font-medium mb-2">
                      Rule: {rule.name}
                    </h3>
                    <div className="mb-2">
                      Template: {rule.template?.name || 'No template'}
                    </div>
                    
                    {/* Rule Test Results */}
                    {testResults && testResults[ruleIndex] && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Condition Results:</h4>
                        <div className="space-y-4">
                          {testResults[ruleIndex].conditionResults.map((result: ConditionResult, i: number) => (
                            <div key={i} className="border rounded">
                              {renderConditionResult(result)}
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 p-4 rounded bg-gray-100">
                          <div className="font-medium">Summary:</div>
                          <div>All conditions met: {testResults[ruleIndex].allConditionsMet ? 'Yes' : 'No'}</div>
                          <div>Has recipient email: {testResults[ruleIndex].hasRecipientEmail ? 'Yes' : 'No'}</div>
                          <div>SendGrid configured: {testResults[ruleIndex].sendgridConfigured ? 'Yes' : 'No'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </Card>
          </>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Select a form to view email rules and test results
          </div>
        )}
      </div>
    </div>
  );
} 