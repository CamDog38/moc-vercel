import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ArrowLeft, Mail, Save, Trash, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CodeEditor } from '@/components/CodeEditor';
import { EmailVariableSelector } from '@/components/EmailVariableSelector';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  type: string;
  description: string;
  folder?: string | null;
};

interface Form {
  id: string;
  name: string;
}

type FormField = {
  id: string;
  label: string;
  type: string;
  sectionTitle: string;
  variableName: string;
};

export default function EditEmailTemplate() {
  const router = useRouter();
  const { id } = router.query;
  
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [folder, setFolder] = useState<string | null>(null);
  const [ccEmails, setCcEmails] = useState('');
  const [bccEmails, setBccEmails] = useState('');
  const [newFolder, setNewFolder] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('edit');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTemplate();
      fetchForms();
    }
  }, [id]);
  
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
      const formsList = data.map((form: Form) => ({
        id: form.id,
        name: form.name
      }));
      
      setForms(formsList);
    } catch (error: unknown) {
      console.error('Error fetching forms:', error);
      toast({
        title: "Error",
        description: "Failed to load forms. Please try again.",
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
    } catch (error: unknown) {
      console.error('Error fetching form fields:', error);
      toast({
        title: "Error",
        description: "Failed to load form fields. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingFields(false);
    }
  };

  const fetchTemplate = async () => {
    try {
      setFetchLoading(true);
      
      // Fetch template data
      const response = await fetch(`/api/emails/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      const data = await response.json();
      setTemplate(data);
      setName(data.name);
      setSubject(data.subject);
      setHtmlContent(data.htmlContent);
      setType(data.type);
      setDescription(data.description || '');
      setFolder(data.folder || null);
      setCcEmails(data.ccEmails || '');
      setBccEmails(data.bccEmails || '');
      
      // Fetch all templates to extract folders
      const templatesResponse = await fetch('/api/emails');
      if (templatesResponse.ok) {
        const templates = await templatesResponse.json();
        const folderSet = new Set<string>();
        templates.forEach((template: EmailTemplate) => {
          if (template.folder) {
            folderSet.add(template.folder);
          }
        });
        setFolders(Array.from(folderSet).sort());
      }
    } catch (error: unknown) {
      console.error('Error fetching template:', error);
      setError('Failed to load template');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch(`/api/emails/${id}`, {
        method: 'PUT',
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
          ccEmails,
          bccEmails,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    } catch (error: unknown) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/emails/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      router.push('/dashboard/emails/templates');
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (error: unknown) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !id) {
      return;
    }

    try {
      setSendingTestEmail(true);
      setError(null);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Sending test email request with:', { templateId: id, to: testEmailAddress });
      }
      
      const response = await fetch('/api/emails/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: id,
          to: testEmailAddress
        }),
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Test email API response status:', response.status);
      }
      const data = await response.json();
      if (process.env.NODE_ENV !== 'production') {
        console.log('Test email API response data:', data);
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      // Close the dialog and show success message
      setTestEmailDialogOpen(false);
      toast({
        title: "Test Email Sent",
        description: `A test email has been sent to ${testEmailAddress}`,
      });
    } catch (err: unknown) {
      console.error('Error sending test email:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while sending the test email';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  if (fetchLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-8">
          <div className="text-center py-12">Loading template...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!template && !fetchLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Template not found</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/emails')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Email Management
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Edit Email Template</h1>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Test Email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Test Email</DialogTitle>
                  <DialogDescription>
                    Enter an email address to send a test version of this template with sample data.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="testEmail">Email Address</Label>
                    <Input
                      id="testEmail"
                      type="email"
                      placeholder="Enter recipient email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>A test email will be sent with sample placeholder data.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleSendTestEmail}
                    disabled={!testEmailAddress || sendingTestEmail}
                  >
                    {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Template
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    email template and remove it from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
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
                    <Label htmlFor="ccEmails">CC Emails</Label>
                    <Input
                      id="ccEmails"
                      value={ccEmails}
                      onChange={(e) => setCcEmails(e.target.value)}
                      placeholder="email1@example.com, email2@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate multiple email addresses with commas
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bccEmails">BCC Emails</Label>
                    <Input
                      id="bccEmails"
                      value={bccEmails}
                      onChange={(e) => setBccEmails(e.target.value)}
                      placeholder="email1@example.com, email2@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate multiple email addresses with commas
                    </p>
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
                              {formFields.map(field => {
                                const variableText = `{{${field.variableName}}}`;
                                return (
                                  <tr key={field.id}>
                                    <td className="p-2">
                                      <code className="font-mono text-xs bg-muted p-1 rounded break-all">
                                        {variableText}
                                      </code>
                                    </td>
                                    <td className="p-2 text-xs">
                                      {field.label} ({field.sectionTitle})
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
                    {loading ? 'Saving...' : 'Save Changes'}
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