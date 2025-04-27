import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { getSampleLineItemsTable, getSampleLineItemsData } from '@/util/template-helpers';

type PdfTemplateType = 'INVOICE' | 'BOOKING' | 'CERTIFICATE';

interface PdfTemplate {
  id?: string;
  name: string;
  description?: string;
  type: PdfTemplateType;
  htmlContent: string;
  cssContent?: string;
  isActive: boolean;
}

interface PdfTemplateEditorProps {
  template?: PdfTemplate;
  defaultType?: PdfTemplateType;
  onSave: (template: PdfTemplate) => Promise<void>;
  onCancel: () => void;
}

const defaultTemplate: PdfTemplate = {
  name: '',
  description: '',
  type: 'INVOICE',
  htmlContent: `<!DOCTYPE html>
<html>
<head>
  <title>Template</title>
</head>
<body>
  <h1>{{title}}</h1>
  <p>This is a sample template. Replace this content with your own.</p>
</body>
</html>`,
  cssContent: `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
}

h1 {
  color: #333;
}`,
  isActive: true
};

const PdfTemplateEditor: React.FC<PdfTemplateEditorProps> = ({ 
  template, 
  defaultType,
  onSave, 
  onCancel 
}) => {
  // Create a modified default template if defaultType is provided
  const initialTemplate = template || {
    ...defaultTemplate,
    type: defaultType || defaultTemplate.type
  };

  const [formData, setFormData] = useState<PdfTemplate>(initialTemplate);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('editor');

  useEffect(() => {
    // Generate preview HTML with sample data
    let preview = formData.htmlContent;
    
    // Process the preview with sample data
    if (formData.type === 'INVOICE') {
      // Import dynamically to avoid SSR issues
      import('@/util/template-helpers').then(({ processTemplateDirectives }) => {
        // Sample data for preview
        const sampleData = {
          title: 'Sample Invoice',
          invoiceNumber: 'INV-2025-001',
          date: new Date().toLocaleDateString(),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          clientName: 'Sample Client',
          clientEmail: 'client@example.com',
          clientPhone: '(555) 123-4567',
          totalAmount: '325.00',
          lineItems: getSampleLineItemsData()
        };
        
        // Process the template with directives
        preview = processTemplateDirectives(preview, sampleData);
        
        // Add CSS if available
        if (formData.cssContent) {
          preview = `<style>${formData.cssContent}</style>${preview}`;
        }
        
        setPreviewHtml(preview);
      });
    } else {
      // For non-invoice templates, just add CSS
      if (formData.cssContent) {
        preview = `<style>${formData.cssContent}</style>${preview}`;
      }
      setPreviewHtml(preview);
    }
  }, [formData.htmlContent, formData.cssContent, formData.type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(formData);
      toast({
        title: "Success",
        description: "Template saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{template?.id ? 'Edit Template' : 'Create Template'}</CardTitle>
        <CardDescription>
          {template?.id 
            ? 'Edit your PDF template details and content' 
            : 'Create a new PDF template for your documents'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="e.g. Standard Invoice"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Template Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => handleSelectChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVOICE">Invoice</SelectItem>
                    <SelectItem value="BOOKING">Booking</SelectItem>
                    <SelectItem value="CERTIFICATE">Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                name="description" 
                value={formData.description || ''} 
                onChange={handleChange} 
                placeholder="Describe the purpose of this template"
                rows={2}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="isActive" 
                checked={formData.isActive} 
                onCheckedChange={(checked) => handleSwitchChange('isActive', checked)} 
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="editor">HTML</TabsTrigger>
                <TabsTrigger value="css">CSS</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="htmlContent">HTML Content</Label>
                    {formData.type === 'INVOICE' && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Insert line items table at cursor position or at the end
                          const textarea = document.getElementById('htmlContent') as HTMLTextAreaElement;
                          const lineItemsTable = getSampleLineItemsTable();
                          
                          if (textarea) {
                            const cursorPos = textarea.selectionStart;
                            const textBefore = formData.htmlContent.substring(0, cursorPos);
                            const textAfter = formData.htmlContent.substring(cursorPos);
                            
                            setFormData(prev => ({
                              ...prev,
                              htmlContent: textBefore + lineItemsTable + textAfter
                            }));
                            
                            // Set focus back to textarea
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(
                                cursorPos + lineItemsTable.length,
                                cursorPos + lineItemsTable.length
                              );
                            }, 0);
                          }
                        }}
                      >
                        Insert Line Items Table
                      </Button>
                    )}
                  </div>
                  <Textarea 
                    id="htmlContent" 
                    name="htmlContent" 
                    value={formData.htmlContent} 
                    onChange={handleChange} 
                    placeholder="Enter your HTML template here"
                    className="font-mono"
                    rows={15}
                    required
                  />
                </div>
              </TabsContent>
              <TabsContent value="css" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cssContent">CSS Styles (Optional)</Label>
                  <Textarea 
                    id="cssContent" 
                    name="cssContent" 
                    value={formData.cssContent || ''} 
                    onChange={handleChange} 
                    placeholder="Enter your CSS styles here"
                    className="font-mono"
                    rows={15}
                  />
                </div>
              </TabsContent>
              <TabsContent value="preview">
                <div className="border rounded-md p-4 min-h-[400px] bg-white">
                  <iframe 
                    srcDoc={previewHtml}
                    style={{ width: '100%', height: '500px', border: 'none' }}
                    title="Template Preview"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Save Template
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default PdfTemplateEditor;
