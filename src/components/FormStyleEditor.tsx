import React, { useState, useEffect } from 'react';
import { CodeEditor } from '@/components/CodeEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Form {
  id: string;
  name: string;
}

interface FormStyle {
  id?: string;
  name: string;
  description?: string;
  cssContent: string;
  isGlobal: boolean;
  formId?: string | null;
}

interface FormStyleEditorProps {
  styleId?: string;
  onSave?: () => void;
}

export function FormStyleEditor({ styleId, onSave }: FormStyleEditorProps) {
  const [forms, setForms] = useState<Form[]>([]);
  const [formStyle, setFormStyle] = useState<FormStyle>({
    name: '',
    description: '',
    cssContent: '/* Add your custom CSS here */\n\n/* Example: */\n.form-container {\n  max-width: 800px;\n  margin: 0 auto;\n}\n\n/* Add a logo */\n.form-header::before {\n  content: "";\n  display: block;\n  background-image: url("https://example.com/logo.png");\n  background-size: contain;\n  background-repeat: no-repeat;\n  width: 150px;\n  height: 50px;\n  margin-bottom: 20px;\n}\n\n/* Customize form fields */\n.form-field label {\n  font-weight: bold;\n  font-size: 1.1rem;\n}\n\n.form-field input, .form-field select, .form-field textarea {\n  border: 2px solid #ddd;\n  border-radius: 8px;\n  padding: 12px;\n}\n',
    isGlobal: false,
    formId: null
  });
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [activeTab, setActiveTab] = useState('editor');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Fetch forms for the dropdown
  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await fetch('/api/forms');
        if (response.ok) {
          const data = await response.json();
          setForms(data);
        }
      } catch (error) {
        console.error('Error fetching forms:', error);
      }
    };

    fetchForms();
  }, []);

  // Fetch form style if editing
  useEffect(() => {
    if (styleId) {
      const fetchFormStyle = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/form-styles/${styleId}`);
          if (response.ok) {
            const data = await response.json();
            setFormStyle(data);
          } else {
            // Handle non-OK responses
            let errorMessage = 'Failed to load form style';
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch (e) {
              console.error('Error parsing error response:', e);
            }
            
            throw new Error(errorMessage);
          }
        } catch (error) {
          console.error('Error fetching form style:', error);
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to load form style',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };

      fetchFormStyle();
    }
  }, [styleId]);

  // Generate preview HTML
  useEffect(() => {
    // Basic form HTML for preview
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Form Preview</title>
        <style>
          /* Base styles */
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.5;
            padding: 1rem;
            max-width: 1200px;
            margin: 0 auto;
            color: #333;
            background-color: #f9f9f9;
          }
          .form-container {
            background-color: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .form-header {
            margin-bottom: 2rem;
          }
          .form-title {
            font-size: 1.8rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
          }
          .form-description {
            color: #666;
          }
          .form-fields {
            display: grid;
            gap: 1.5rem;
          }
          .form-field {
            display: flex;
            flex-direction: column;
          }
          .form-field label {
            margin-bottom: 0.5rem;
            font-weight: 500;
          }
          .form-field input, .form-field select, .form-field textarea {
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
          }
          .form-field textarea {
            min-height: 100px;
          }
          .form-submit {
            margin-top: 2rem;
          }
          .form-submit button {
            background-color: #2563eb;
            color: white;
            font-weight: 500;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
          }
          .form-submit button:hover {
            background-color: #1d4ed8;
          }
          
          /* Custom CSS */
          ${formStyle.cssContent}
        </style>
      </head>
      <body>
        <div class="form-container">
          <div class="form-header">
            <h1 class="form-title">Sample Form</h1>
            <p class="form-description">This is a preview of how your form styling will look.</p>
          </div>
          
          <div class="form-fields">
            <div class="form-field">
              <label for="name">Full Name</label>
              <input type="text" id="name" placeholder="Enter your full name" />
            </div>
            
            <div class="form-field">
              <label for="email">Email Address</label>
              <input type="email" id="email" placeholder="Enter your email address" />
            </div>
            
            <div class="form-field">
              <label for="phone">Phone Number</label>
              <input type="tel" id="phone" placeholder="Enter your phone number" />
            </div>
            
            <div class="form-field">
              <label for="date">Event Date</label>
              <input type="date" id="date" />
            </div>
            
            <div class="form-field">
              <label for="service">Service Type</label>
              <select id="service">
                <option value="">Select a service</option>
                <option value="wedding">Wedding Ceremony</option>
                <option value="registration">Registration</option>
                <option value="consultation">Consultation</option>
              </select>
            </div>
            
            <div class="form-field">
              <label for="message">Additional Information</label>
              <textarea id="message" placeholder="Please provide any additional details"></textarea>
            </div>
          </div>
          
          <div class="form-submit">
            <button type="submit">Submit</button>
          </div>
        </div>
      </body>
      </html>
    `;

    setPreviewHtml(html);

    // Create a preview URL if a form is selected
    if (formStyle.formId) {
      setPreviewUrl(`/forms/${formStyle.formId}/view?preview=true&styleId=${styleId || 'new'}`);
    } else {
      setPreviewUrl('');
    }
  }, [formStyle.cssContent, formStyle.formId, styleId]);

  const handleSave = async () => {
    try {
      if (!formStyle.name) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a name for the style',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);

      const url = styleId 
        ? `/api/form-styles/${styleId}` 
        : '/api/form-styles';
      
      const method = styleId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formStyle),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save form style';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
          // If we can't parse the JSON, it might be an empty or malformed response
          errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Try to parse the response
      const result = await response.json();

      toast({
        title: 'Success',
        description: styleId ? 'Form style updated successfully' : 'Form style created successfully',
      });

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving form style:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save form style',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{styleId ? 'Edit Form Style' : 'Create Form Style'}</CardTitle>
          <CardDescription>
            Customize the appearance of your forms with custom CSS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Style Name</Label>
                <Input
                  id="name"
                  value={formStyle.name}
                  onChange={(e) => setFormStyle({ ...formStyle, name: e.target.value })}
                  placeholder="Enter a name for this style"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="formId">Apply To</Label>
                <Select
                  value={formStyle.isGlobal ? 'global' : (formStyle.formId || '')}
                  onValueChange={(value) => {
                    if (value === 'global') {
                      setFormStyle({ ...formStyle, isGlobal: true, formId: null });
                    } else {
                      setFormStyle({ ...formStyle, isGlobal: false, formId: value || null });
                    }
                  }}
                >
                  <SelectTrigger id="formId">
                    <SelectValue placeholder="Select where to apply this style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">All Forms (Global)</SelectItem>
                    {forms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formStyle.description || ''}
                onChange={(e) => setFormStyle({ ...formStyle, description: e.target.value })}
                placeholder="Enter a description for this style"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">CSS Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="editor" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>CSS Editor</CardTitle>
              <CardDescription>
                Write custom CSS to style your forms. Changes will be reflected in the preview.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeEditor
                value={formStyle.cssContent}
                onChange={(value) => setFormStyle({ ...formStyle, cssContent: value })}
                language="css"
                height="400px"
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                This is how your form will look with the applied styles.
                {previewUrl && (
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal text-blue-500"
                    onClick={() => window.open(previewUrl, '_blank')}
                  >
                    Open in new window
                  </Button>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden bg-white">
                <iframe
                  srcDoc={previewHtml}
                  title="Form Preview"
                  className="w-full h-[600px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={() => window.history.back()}>Cancel</Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : (styleId ? 'Update Style' : 'Save Style')}
        </Button>
      </div>
    </div>
  );
}