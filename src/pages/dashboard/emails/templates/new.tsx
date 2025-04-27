import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  type: string;
  description?: string;
  folder?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Form {
  id: string;
  name: string;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  sectionTitle?: string;
  variableName?: string;
  key?: string;
  options?: string[];
}
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from "@/components/ui/use-toast";
import { CodeEditor } from '@/components/CodeEditor';
import { EmailVariableSelector } from '@/components/EmailVariableSelector';

export default function NewEmailTemplate() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState(`<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #f5f5f5;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{companyName}}</h1>
    </div>
    <div class="content">
      <p>Dear {{name}},</p>
      <p>Thank you for your message. This is a confirmation that we've received your inquiry.</p>
      <p>We'll get back to you as soon as possible.</p>
      <p>Best regards,<br>The Team</p>
    </div>
    <div class="footer">
      <p>  {{currentYear}} {{companyName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`);
  const [type, setType] = useState('INQUIRY');
  const [description, setDescription] = useState('');
  const [folder, setFolder] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('edit');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  
  // Fetch forms and folders when component mounts
  useEffect(() => {
    fetchForms();
    fetchFolders();
  }, []);
  
  // Fetch existing folders
  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/emails');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const templates = await response.json() as EmailTemplate[];
      const folderSet = new Set<string>();
      
      templates.forEach((template: EmailTemplate) => {
        if (template.folder) {
          folderSet.add(template.folder);
        }
      });
      
      setFolders(Array.from(folderSet).sort());
    } catch (err: unknown) {
      console.error('Error fetching folders:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while fetching folders';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  // Fetch form fields when a form is selected
  useEffect(() => {
    if (selectedFormId) {
      fetchFormFields(selectedFormId);
    }
  }, [selectedFormId]);
  
  const fetchForms = async () => {
    try {
      const response = await fetch('/api/forms');
      if (!response.ok) {
        throw new Error('Failed to fetch forms');
      }
      
      const data = await response.json();
      // Extract just the id and name for the dropdown
      const formsList = data.map((form: any) => ({
        id: form.id,
        name: form.name
      }));
      
      setForms(formsList);
    } catch (err: unknown) {
      console.error('Error fetching forms:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while fetching forms';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  const fetchFormFields = async (formId: string) => {
    try {
      setLoadingFields(true);
      const response = await fetch(`/api/forms/${formId}/fields`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch form fields');
      }
      
      const fields = await response.json();
      setFormFields(fields);
    } catch (err: unknown) {
      console.error('Error fetching form fields:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while fetching form fields';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoadingFields(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !subject || !htmlContent || !type) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          subject,
          htmlContent,
          type,
          description,
          folder: folder === "uncategorized" ? null : folder,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create template');
      }
      
      router.push('/dashboard/emails');
    } catch (err: unknown) {
      console.error('Error creating template:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while creating the template';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Create Email Template</h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Template Details</CardTitle>
                  <CardDescription>
                    Basic information about your email template
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Inquiry Confirmation"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Email Subject *</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Thank you for your inquiry"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Template Type *</Label>
                    <Select
                      value={type}
                      onValueChange={setType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INQUIRY">Inquiry Response</SelectItem>
                        <SelectItem value="BOOKING_CONFIRMATION">Booking Confirmation</SelectItem>
                        <SelectItem value="INVOICE">Invoice</SelectItem>
                        <SelectItem value="CUSTOM">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description of this template"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="folder">Folder</Label>
                    {showNewFolderInput ? (
                      <div className="flex gap-2">
                        <Input
                          id="newFolder"
                          value={newFolder}
                          onChange={(e) => setNewFolder(e.target.value)}
                          placeholder="Enter new folder name"
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (newFolder.trim()) {
                              setFolder(newFolder.trim());
                              setFolders(prev => [...prev, newFolder.trim()].sort());
                              setShowNewFolderInput(false);
                              setNewFolder('');
                            }
                          }}
                        >
                          Add
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setShowNewFolderInput(false);
                            setNewFolder('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Select
                          value={folder || ""}
                          onValueChange={setFolder}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a folder" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="uncategorized">Uncategorized</SelectItem>
                            {folders.map(f => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowNewFolderInput(true)}
                        >
                          New Folder
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Organize your templates by placing them in folders
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Form Field Variables</CardTitle>
                  <CardDescription>
                    Select a form to view and copy available field variables
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedFormId}
                            onValueChange={setSelectedFormId}
                          >
                            <SelectTrigger className="h-8 w-[180px]">
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
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => selectedFormId && fetchFormFields(selectedFormId)}
                            disabled={loadingFields || !selectedFormId}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {loadingFields ? (
                        <div className="text-center py-2">Loading fields...</div>
                      ) : formFields.length > 0 ? (
                        <div className="max-h-[400px] overflow-y-auto border rounded-md">
                          <table className="w-full">
                            <thead className="bg-muted sticky top-0">
                              <tr>
                                <th className="text-left p-2 text-xs">Field Variable</th>
                                <th className="text-left p-2 text-xs">Description</th>
                                <th className="text-right p-2 text-xs w-16">Copy</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {/* Group fields by section */}
                              {Array.from(new Set(formFields.map(field => field.sectionTitle))).map(sectionTitle => {
                                const sectionFields = formFields.filter(field => field.sectionTitle === sectionTitle);
                                return (
                                  <React.Fragment key={sectionTitle}>
                                    {/* Section header */}
                                    <tr className="bg-muted/50">
                                      <td colSpan={3} className="p-2 font-medium text-xs">
                                        {sectionTitle}
                                      </td>
                                    </tr>
                                    {/* Section fields */}
                                    {sectionFields.map(field => {
                                      const variableText = `{{${field.id}}}`;
                                      return (
                                        <tr key={field.id}>
                                          <td className="p-2">
                                            <code className="font-mono text-xs bg-muted p-1 rounded break-all">
                                              {variableText}
                                            </code>
                                          </td>
                                          <td className="p-2 text-xs">
                                            {field.label}
                                          </td>
                                          <td className="p-2 text-right">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6"
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                navigator.clipboard.writeText(variableText);
                                                toast({
                                                  title: "Copied!",
                                                  description: `Variable ${variableText} copied to clipboard`,
                                                  duration: 2000,
                                                });
                                              }}
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                            </Button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : selectedFormId ? (
                        <div className="text-center py-2 text-muted-foreground">
                          No fields found for this form
                        </div>
                      ) : (
                        <div className="text-center py-2 text-muted-foreground">
                          Select a form to view available fields
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-2 border-t pt-2">
                      <p>Note: When using field variables, blank values will be displayed if the field is empty.</p>
                      <p className="mt-1">Variables are now prefixed with their section name (e.g., <code>partner1FirstName</code> for a field "First Name" in section "Partner 1").</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Lead Variables</CardTitle>
                  <CardDescription>
                    Variables for lead tracking and booking links
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div className="max-h-[400px] overflow-y-auto border rounded-md">
                      <table className="w-full">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="text-left p-2 text-xs">Variable</th>
                            <th className="text-left p-2 text-xs">Description</th>
                            <th className="text-right p-2 text-xs w-16">Copy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {[
                            { id: 'leadId', description: 'Unique identifier for the lead (used in booking links)' },
                            { id: 'bookingLink', description: 'Automatically generated booking link using the lead ID' },
                            { id: 'trackingToken', description: 'Tracking token for form submissions' },
                            { id: 'timeStamp', description: 'Timestamp of form submission' }
                          ].map(field => {
                            const variableText = `{{${field.id}}}`;
                            return (
                              <tr key={field.id}>
                                <td className="p-2">
                                  <code className="font-mono text-xs bg-muted p-1 rounded break-all">
                                    {variableText}
                                  </code>
                                </td>
                                <td className="p-2 text-xs">
                                  {field.description}
                                </td>
                                <td className="p-2 text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      navigator.clipboard.writeText(variableText);
                                      toast({
                                        title: "Copied!",
                                        description: `Variable ${variableText} copied to clipboard`,
                                        duration: 2000,
                                      });
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 border-t pt-2">
                      <p>Note: The leadId variable is essential for generating booking links in emails.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Invoice Variables</CardTitle>
                  <CardDescription>
                    Available invoice field variables for email templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div className="max-h-[400px] overflow-y-auto border rounded-md">
                      <table className="w-full">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="text-left p-2 text-xs">Variable</th>
                            <th className="text-left p-2 text-xs">Description</th>
                            <th className="text-right p-2 text-xs w-16">Copy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {[
                            { id: 'id', description: 'Invoice ID' },
                            { id: 'invoiceNumber', description: 'Invoice Number' },
                            { id: 'status', description: 'Invoice Status' },
                            { id: 'totalAmount', description: 'Total Amount' },
                            { id: 'serviceRate', description: 'Service Rate' },
                            { id: 'serviceType', description: 'Service Type' },
                            { id: 'travelCosts', description: 'Travel Costs' },
                            { id: 'dueDate', description: 'Due Date' },
                            { id: 'clientName', description: 'Client Name' },
                            { id: 'email', description: 'Client Email' },
                            { id: 'phone', description: 'Client Phone' },
                            { id: 'bookingDate', description: 'Booking Date' },
                            { id: 'bookingTime', description: 'Booking Time' },
                            { id: 'location', description: 'Booking Location' },
                            { id: 'officerName', description: 'Officer Full Name' },
                            { id: 'officerTitle', description: 'Officer Title' },
                            { id: 'officerPhone', description: 'Officer Phone Number' },
                            { id: 'invoiceLink', description: 'Invoice View Link' }
                          ].map(field => {
                            const variableText = `{{${field.id}}}`;
                            return (
                              <tr key={field.id}>
                                <td className="p-2">
                                  <code className="font-mono text-xs bg-muted p-1 rounded break-all">
                                    {variableText}
                                  </code>
                                </td>
                                <td className="p-2 text-xs">
                                  {field.description}
                                </td>
                                <td className="p-2 text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      navigator.clipboard.writeText(variableText);
                                      toast({
                                        title: "Copied!",
                                        description: `Variable ${variableText} copied to clipboard`,
                                        duration: 2000,
                                      });
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 border-t pt-2">
                      <p>Note: These variables are only available in invoice-related email templates.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>Email Content</CardTitle>
                  <CardDescription>
                    Design your email template with HTML
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="edit">Edit HTML</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="edit" className="h-full">
                      <div className="mb-2 flex justify-end">
                        <EmailVariableSelector 
                          onInsert={(variable) => {
                            setHtmlContent(prev => prev + variable);
                          }} 
                        />
                      </div>
                      <CodeEditor
                        value={htmlContent}
                        onChange={setHtmlContent}
                        language="html"
                        height="500px"
                      />
                    </TabsContent>
                    
                    <TabsContent value="preview" className="h-full">
                      <div className="border rounded-md h-[500px] overflow-auto p-4">
                        <iframe
                          srcDoc={htmlContent}
                          title="Email Preview"
                          className="w-full h-full"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="border-t p-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="ml-auto"
                  >
                    {loading ? 'Saving...' : 'Save Template'}
                    {!loading && <Save className="ml-2 h-4 w-4" />}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}