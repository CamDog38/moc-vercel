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
import { useRouter } from 'next/router';

type Form = {
  id: string;
  name: string;
  type: string;
};

export default function InquiryEmailTest() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  
  // Fetch forms
  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await fetch('/api/forms');
        if (response.ok) {
          const data = await response.json();
          // Filter to only include inquiry forms
          const inquiryForms = data.filter((form: any) => form.type === 'INQUIRY');
          setForms(inquiryForms);
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
  
  const handleTestEmail = async () => {
    if (!selectedForm) {
      toast({
        title: "Error",
        description: "Please select a form",
        variant: "destructive",
      });
      return;
    }
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/test/inquiry-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: selectedForm,
          email: email
        }),
      });
      
      const result = await response.json();
      setTestResult(result);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Test email sent successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to send test email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error testing email:', error);
      toast({
        title: "Error",
        description: "An error occurred while testing the email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inquiry Email Test</h1>
        <Button onClick={() => router.push('/dashboard/settings')}>
          Back to Settings
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Inquiry Form Email</CardTitle>
          <CardDescription>
            Send a test email to verify that your inquiry form email automation is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form">Inquiry Form</Label>
            <Select value={selectedForm} onValueChange={setSelectedForm}>
              <SelectTrigger id="form">
                <SelectValue placeholder="Select an inquiry form" />
              </SelectTrigger>
              <SelectContent>
                {forms.length > 0 ? (
                  forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No inquiry forms found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Test Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter recipient email address"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleTestEmail} 
            disabled={!selectedForm || !email || isLoading}
            className="w-full"
          >
            {isLoading ? "Sending..." : "Send Test Email"}
          </Button>
        </CardFooter>
      </Card>
      
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
              {testResult.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Form Information</h3>
              {testResult.form && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p><span className="font-medium">Name:</span> {testResult.form.name}</p>
                  <p><span className="font-medium">Type:</span> {testResult.form.type}</p>
                  <p><span className="font-medium">ID:</span> {testResult.form.id}</p>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Results</h3>
              {testResult.results && testResult.results.length > 0 ? (
                <div className="space-y-3">
                  {testResult.results.map((result: any, index: number) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
                    >
                      <p className="font-medium">{result.ruleName || `Rule ${index + 1}`}</p>
                      {result.success ? (
                        <div className="mt-2 text-sm">
                          <p><span className="font-medium">To:</span> {result.emailDetails?.to}</p>
                          <p><span className="font-medium">Subject:</span> {result.emailDetails?.subject}</p>
                        </div>
                      ) : (
                        <p className="text-red-700 mt-1">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No results available</p>
              )}
            </div>
            
            <Textarea
              className="font-mono text-sm h-64 mt-4"
              value={JSON.stringify(testResult, null, 2)}
              readOnly
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
