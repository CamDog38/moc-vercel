import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from 'next/router';
import { Checkbox } from "@/components/ui/checkbox";

type Form = {
  id: string;
  name: string;
  type: string;
};

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
};

type EmailRule = {
  id: string;
  name: string;
  formId: string;
  templateId: string;
  conditions: string;
  active: boolean;
};

export default function EmailRuleTester() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<string>('');
  const [testFormData, setTestFormData] = useState<Record<string, string>>({});
  const [formFields, setFormFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testMode, setTestMode] = useState<'rule' | 'directEmail'>('rule');
  const [recepientEmail, setRecepientEmail] = useState('');
  const [logRuleProcessing, setLogRuleProcessing] = useState(true);
  
  // Fetch forms, templates, and rules
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch forms
        const formsRes = await fetch('/api/forms');
        if (formsRes.ok) {
          const formsData = await formsRes.json();
          setForms(formsData);
        }
        
        // Fetch email templates
        const templatesRes = await fetch('/api/emails/templates');
        if (templatesRes.ok) {
          const templatesData = await templatesRes.json();
          setTemplates(templatesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    fetchData();
  }, [toast]);
  
  // Fetch rules when form changes
  useEffect(() => {
    if (selectedForm) {
      const fetchRules = async () => {
        try {
          const rulesRes = await fetch(`/api/emails/rules?formId=${selectedForm}`);
          if (rulesRes.ok) {
            const rulesData = await rulesRes.json();
            setRules(rulesData);
            if (rulesData.length > 0) {
              setSelectedRule(rulesData[0].id);
            } else {
              setSelectedRule('');
            }
          }
          
          // Fetch form fields to use for test data
          const formRes = await fetch(`/api/forms/${selectedForm}`);
          if (formRes.ok) {
            const formData = await formRes.json();
            
            // Extract field IDs from form sections
            const fieldIds: string[] = [];
            if (formData.formSections) {
              formData.formSections.forEach((section: any) => {
                if (section.fields) {
                  section.fields.forEach((field: any) => {
                    fieldIds.push(field.id);
                  });
                }
              });
            }
            
            setFormFields(fieldIds);
            
            // Initialize test form data with empty values for each field
            const initialTestData: Record<string, string> = {};
            fieldIds.forEach(fieldId => {
              initialTestData[fieldId] = '';
            });
            
            // Always add email field for testing
            if (!initialTestData.email) {
              initialTestData.email = '';
            }
            
            setTestFormData(initialTestData);
          }
        } catch (error) {
          console.error('Error fetching rules:', error);
        }
      };
      
      fetchRules();
    } else {
      setRules([]);
      setSelectedRule('');
      setFormFields([]);
      setTestFormData({});
    }
  }, [selectedForm]);
  
  const handleRuleTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      // Create test data including form ID and required metadata
      const testData = {
        ...testFormData,
        id: 'test-submission-id',
        formId: selectedForm,
      };
      
      // Make API call to test the rule
      const response = await fetch('/api/emails/process-submission2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: selectedForm,
          formData: testData,
          ruleId: selectedRule, // Only test this specific rule
          testMode: true,
          logProcessing: logRuleProcessing
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      setTestResult(result);
      
      if (result.success) {
        toast({
          title: "Test Successful",
          description: "Email rule condition matched and would trigger email.",
        });
      } else {
        toast({
          title: "Test Result",
          description: result.message || "Rule conditions not met.",
        });
      }
    } catch (error) {
      console.error('Error testing rule:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to test rule",
        variant: "destructive",
      });
      setTestResult({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendTestEmail = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      // Send a test email using the selected template
      const response = await fetch('/api/emails/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          to: recepientEmail
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      setTestResult(result);
      
      toast({
        title: "Email Sent",
        description: "Test email was sent successfully.",
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test email",
        variant: "destructive",
      });
      setTestResult({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get the selected rule's conditions
  const selectedRuleData = selectedRule ? rules.find(r => r.id === selectedRule) : null;
  let parsedConditions: any[] = [];
  if (selectedRuleData && selectedRuleData.conditions) {
    try {
      parsedConditions = JSON.parse(selectedRuleData.conditions);
    } catch (e) {
      console.error('Error parsing conditions:', e);
    }
  }
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Email Rule Tester</h1>
        <Button onClick={() => router.push('/dashboard/settings')}>
          Back to Settings
        </Button>
      </div>
      
      <div className="grid gap-6">
        <Tabs defaultValue="rule" onValueChange={(value) => setTestMode(value as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="rule">Test Email Rule</TabsTrigger>
            <TabsTrigger value="directEmail">Send Test Email</TabsTrigger>
          </TabsList>
          
          <TabsContent value="rule">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Rule Configuration</CardTitle>
                  <CardDescription>Select the form and rule to test</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="form">Form</Label>
                    <Select value={selectedForm} onValueChange={setSelectedForm}>
                      <SelectTrigger id="form">
                        <SelectValue placeholder="Select a form" />
                      </SelectTrigger>
                      <SelectContent>
                        {forms.map((form) => (
                          <SelectItem key={form.id} value={form.id}>
                            {form.name} ({form.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="rule">Email Rule</Label>
                    <Select 
                      value={selectedRule} 
                      onValueChange={setSelectedRule}
                      disabled={!selectedForm || rules.length === 0}
                    >
                      <SelectTrigger id="rule">
                        <SelectValue placeholder={rules.length > 0 ? "Select a rule" : "No rules available"} />
                      </SelectTrigger>
                      <SelectContent>
                        {rules.map((rule) => (
                          <SelectItem key={rule.id} value={rule.id}>
                            {rule.name} {rule.active ? '(Active)' : '(Inactive)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {rules.length === 0 && selectedForm && (
                    <Alert className="bg-amber-50 text-amber-900 border-amber-200">
                      <AlertCircle className="h-4 w-4 mt-1" />
                      <AlertTitle>No Rules Found</AlertTitle>
                      <AlertDescription>
                        There are no email rules defined for this form. 
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-amber-900 underline"
                          onClick={() => router.push('/dashboard/emails/rules/new')}
                        >
                          Create a new rule
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {selectedRuleData && (
                    <div className="space-y-2 pt-4">
                      <h3 className="font-semibold">Rule Conditions</h3>
                      <div className="border rounded-md p-3 bg-gray-50">
                        {parsedConditions.length > 0 ? (
                          <ul className="space-y-2">
                            {parsedConditions.map((condition, index) => (
                              <li key={index} className="text-sm">
                                <span className="font-medium">Field:</span> {condition.field} 
                                &nbsp;<ArrowRight className="inline h-3 w-3" />&nbsp;
                                <span className="font-medium">{condition.operator}</span> 
                                &nbsp;<span className="px-1 py-0.5 bg-gray-200 rounded">{condition.value}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">No conditions defined. Rule will always match.</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <div className="flex items-center space-x-2 pb-4">
                      <Checkbox 
                        id="log-processing" 
                        checked={logRuleProcessing}
                        onCheckedChange={(checked) => setLogRuleProcessing(checked as boolean)}
                      />
                      <Label htmlFor="log-processing">Log rule processing details</Label>
                    </div>
                    
                    <Button 
                      onClick={handleRuleTest} 
                      disabled={!selectedForm || !selectedRule || isLoading}
                      className="w-full"
                    >
                      {isLoading ? "Testing..." : "Test Rule"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Test Form Data</CardTitle>
                  <CardDescription>Enter form data to test against the rule conditions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.keys(testFormData).length > 0 ? (
                    Object.entries(testFormData).map(([fieldId, value]) => (
                      <div key={fieldId} className="space-y-2">
                        <Label htmlFor={`field-${fieldId}`}>{fieldId}</Label>
                        <Input
                          id={`field-${fieldId}`}
                          value={value}
                          onChange={(e) => setTestFormData({ ...testFormData, [fieldId]: e.target.value })}
                          placeholder={`Value for ${fieldId}`}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-gray-500">
                      {selectedForm ? "Loading form fields..." : "Select a form to view available fields"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="directEmail">
            <Card>
              <CardHeader>
                <CardTitle>Send Test Email</CardTitle>
                <CardDescription>Send a test email using an email template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template">Email Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} - {template.subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Email</Label>
                  <Input
                    id="recipient"
                    type="email"
                    value={recepientEmail}
                    onChange={(e) => setRecepientEmail(e.target.value)}
                    placeholder="Enter recipient email"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleSendTestEmail} 
                  disabled={!selectedTemplate || !recepientEmail || isLoading}
                  className="w-full"
                >
                  {isLoading ? "Sending..." : "Send Test Email"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        
        {testResult && (
          <Card className={testResult.success ? "border-green-300" : "border-red-300"}>
            <CardHeader className={testResult.success ? "bg-green-50" : "bg-red-50"}>
              <div className="flex items-center">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                <CardTitle className={testResult.success ? "text-green-800" : "text-red-800"}>
                  {testResult.success ? "Success" : "Failed"}
                </CardTitle>
              </div>
              <CardDescription className={testResult.success ? "text-green-700" : "text-red-700"}>
                {testResult.message || (testResult.success ? "Test completed successfully" : "Test failed")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                className="font-mono text-sm h-64"
                value={JSON.stringify(testResult, null, 2)}
                readOnly
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
