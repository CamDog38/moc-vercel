import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Form = {
  id: string;
  name: string;
  type: string;
  formSections?: any[];
};

export default function FormDebugger() {
  const { toast } = useToast();
  
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [formDetails, setFormDetails] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  
  // Fetch forms
  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await fetch('/api/forms');
        if (response.ok) {
          const data = await response.json();
          setForms(data);
        } else {
          console.error('Failed to fetch forms:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching forms:', error);
        toast({
          title: "Error",
          description: "Failed to load forms. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    fetchForms();
  }, [toast]);
  
  // Fetch form details when a form is selected
  useEffect(() => {
    if (!selectedForm) {
      setFormDetails(null);
      setFormData({});
      return;
    }
    
    const fetchFormDetails = async () => {
      try {
        const response = await fetch(`/api/forms/${selectedForm}`);
        if (response.ok) {
          const data = await response.json();
          setFormDetails(data);
          
          // Initialize form data with empty values for each field
          const initialData: Record<string, string> = {};
          if (data.formSections) {
            data.formSections.forEach((section: any) => {
              if (section.fields) {
                section.fields.forEach((field: any) => {
                  initialData[field.id] = '';
                });
              }
            });
          }
          setFormData(initialData);
        } else {
          console.error('Failed to fetch form details:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching form details:', error);
        toast({
          title: "Error",
          description: "Failed to load form details. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    fetchFormDetails();
  }, [selectedForm, toast]);
  
  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };
  
  const handleDebugSubmit = async () => {
    if (!selectedForm) {
      toast({
        title: "Error",
        description: "Please select a form",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setDebugResult(null);
    
    try {
      const response = await fetch(`/api/forms/${selectedForm}/debug-submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      setDebugResult(result);
      
      toast({
        title: result.success ? "Success" : "Warning",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error debugging form submission:', error);
      toast({
        title: "Error",
        description: "An error occurred while debugging the form submission",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Form Submission Debugger</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Debug Form Submission</CardTitle>
          <CardDescription>
            Test form submissions with detailed logging to diagnose email trigger issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form">Select Form</Label>
            <Select value={selectedForm} onValueChange={setSelectedForm}>
              <SelectTrigger id="form">
                <SelectValue placeholder="Select a form" />
              </SelectTrigger>
              <SelectContent>
                {forms.length > 0 ? (
                  forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name} ({form.type})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No forms found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {formDetails && (
            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-medium">Form Fields</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Fill in the form fields below to test the form submission
              </p>
              
              {formDetails.formSections?.map((section, sectionIndex) => (
                <div key={section.id} className="border rounded-md p-4 mb-4">
                  <h4 className="font-medium mb-2">{section.title || `Section ${sectionIndex + 1}`}</h4>
                  <div className="space-y-3">
                    {section.fields?.map((field: any) => (
                      <div key={field.id} className="space-y-1">
                        <Label htmlFor={field.id}>
                          {field.label || field.id}
                          {field.mapping && (
                            <span className="ml-2 text-xs text-blue-500">
                              (Mapped to: {field.mapping})
                            </span>
                          )}
                        </Label>
                        {field.type === 'textarea' ? (
                          <Textarea
                            id={field.id}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.placeholder || ''}
                          />
                        ) : (
                          <Input
                            id={field.id}
                            type={field.type === 'email' ? 'email' : 'text'}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.placeholder || ''}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Add common fields that might not be in the form structure */}
              <div className="border rounded-md p-4 mb-4 border-amber-200 bg-amber-50">
                <h4 className="font-medium mb-2">Common Fields (if not already included)</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  These fields are commonly used in email rules but might not be explicitly defined in the form structure
                </p>
                <div className="space-y-3">
                  {!Object.keys(formData).some(key => key.toLowerCase().includes('email')) && (
                    <div className="space-y-1">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData['email'] || ''}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        placeholder="user@example.com"
                      />
                    </div>
                  )}
                  {!Object.keys(formData).some(key => key.toLowerCase().includes('name')) && (
                    <div className="space-y-1">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData['name'] || ''}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleDebugSubmit} 
            disabled={!selectedForm || isLoading || !formDetails}
            className="w-full"
          >
            {isLoading ? "Processing..." : "Debug Form Submission"}
          </Button>
        </CardFooter>
      </Card>
      
      {debugResult && (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="rules">Email Rules</TabsTrigger>
            <TabsTrigger value="log">Debug Log</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary">
            <Card className={debugResult.success ? "border-green-300" : "border-amber-300"}>
              <CardHeader className={debugResult.success ? "bg-green-50" : "bg-amber-50"}>
                <div className="flex items-center">
                  {debugResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
                  )}
                  <CardTitle className={debugResult.success ? "text-green-800" : "text-amber-800"}>
                    {debugResult.success ? "Email Rules Matched" : "No Email Rules Matched"}
                  </CardTitle>
                </div>
                <CardDescription className={debugResult.success ? "text-green-700" : "text-amber-700"}>
                  {debugResult.message}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Form Submission</h3>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p><span className="font-medium">Submission ID:</span> {debugResult.submissionId}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Mapped Data</h3>
                  <div className="bg-gray-50 p-3 rounded-md">
                    {debugResult.mappedData && Object.entries(debugResult.mappedData).map(([key, value]) => (
                      <p key={key}>
                        <span className="font-medium">{key}:</span> {value as string || '(empty)'}
                      </p>
                    ))}
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Email Rules Summary</h3>
                  <div className="space-y-3">
                    {debugResult.results && debugResult.results.length > 0 ? (
                      debugResult.results.map((result: any, index: number) => (
                        <div 
                          key={index} 
                          className={`p-3 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}
                        >
                          <p className="font-medium">{result.ruleName || `Rule ${index + 1}`}</p>
                          {result.success ? (
                            <div className="mt-2 text-sm">
                              <p><span className="font-medium">To:</span> {result.emailDetails?.to}</p>
                              <p><span className="font-medium">Subject:</span> {result.emailDetails?.subject}</p>
                            </div>
                          ) : (
                            <p className="text-amber-700 mt-1">{result.error}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No email rules processed</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>Email Rules Details</CardTitle>
                <CardDescription>
                  Detailed information about how each email rule was evaluated
                </CardDescription>
              </CardHeader>
              <CardContent>
                {debugResult.results && debugResult.results.length > 0 ? (
                  debugResult.results.map((result: any, index: number) => (
                    <div key={index} className="mb-6 border rounded-md overflow-hidden">
                      <div className={`p-4 ${result.success ? 'bg-green-50' : 'bg-amber-50'}`}>
                        <h3 className="font-medium text-lg">{result.ruleName || `Rule ${index + 1}`}</h3>
                        <p className={`text-sm ${result.success ? 'text-green-700' : 'text-amber-700'}`}>
                          {result.success ? 'Rule conditions matched' : result.error}
                        </p>
                      </div>
                      
                      {result.conditionResults && (
                        <div className="p-4 border-t">
                          <h4 className="font-medium mb-2">Condition Evaluation</h4>
                          <div className="space-y-3">
                            {result.conditionResults.map((condition: any, condIndex: number) => (
                              <div 
                                key={condIndex} 
                                className={`p-3 rounded-md border ${condition.result ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-medium">{condition.field}</p>
                                  <span className={`text-xs px-2 py-1 rounded-full ${condition.result ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {condition.result ? 'Matched' : 'Not Matched'}
                                  </span>
                                </div>
                                <div className="mt-2 text-sm">
                                  <p><span className="font-medium">Operator:</span> {condition.operator}</p>
                                  <p><span className="font-medium">Expected:</span> {condition.expectedValue}</p>
                                  <p><span className="font-medium">Actual:</span> {condition.actualValue}</p>
                                  <p><span className="font-medium">Reason:</span> {condition.reason}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {result.success && result.emailDetails && (
                        <div className="p-4 border-t">
                          <h4 className="font-medium mb-2">Email Details</h4>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">From:</span> {result.emailDetails.from}</p>
                            <p><span className="font-medium">To:</span> {result.emailDetails.to}</p>
                            <p><span className="font-medium">Subject:</span> {result.emailDetails.subject}</p>
                            <div>
                              <p className="font-medium mb-1">Content Preview:</p>
                              <div className="bg-gray-50 p-2 rounded border text-xs font-mono whitespace-pre-wrap">
                                {result.emailDetails.htmlPreview}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No email rules processed</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="log">
            <Card>
              <CardHeader>
                <CardTitle>Debug Log</CardTitle>
                <CardDescription>
                  Step-by-step log of the form submission processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm overflow-auto max-h-[500px]">
                  {debugResult.debugLog && debugResult.debugLog.map((log: any, index: number) => (
                    <div key={index} className="mb-2">
                      <span className="text-blue-300">[{log.timestamp}]</span>{' '}
                      <span className="text-green-300">{log.step}</span>
                      {log.data && (
                        <pre className="text-xs text-gray-400 ml-8 mt-1 whitespace-pre-wrap">
                          {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : log.data}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>Raw Debug Data</CardTitle>
                <CardDescription>
                  Complete raw debug data for advanced troubleshooting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="font-mono text-sm h-[500px]"
                  value={JSON.stringify(debugResult, null, 2)}
                  readOnly
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
