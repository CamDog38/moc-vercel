/**
 * Form System 2.0 - Form Style Editor
 * 
 * This component provides a CSS editor for styling Form System 2.0 forms.
 * It allows users to create, edit, and preview custom styles for their forms.
 */

import React, { useState, useEffect } from 'react';
import { CodeEditor } from '@/components/CodeEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Save, Eye } from 'lucide-react';

interface FormStyle {
  id?: string;
  name: string;
  description?: string;
  cssContent: string;
  isGlobal: boolean;
  formId?: string | null;
}

interface FormStyleEditorProps {
  formId: string;
  formName: string;
}

export function FormStyleEditor({ formId, formName }: FormStyleEditorProps) {
  const [formStyles, setFormStyles] = useState<FormStyle[]>([]);
  const [currentStyle, setCurrentStyle] = useState<FormStyle>({
    name: `${formName} Style`,
    description: `Custom style for ${formName}`,
    cssContent: `/* Custom CSS for ${formName} */

/* Main form container */
.min-h-screen {
  min-height: 100vh;
}

.bg-background {
  background-color: #f8f9fa;
}

/* Card styling */
.max-w-4xl {
  max-width: 72rem;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

/* Card component styling */
[class*="Card"] {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Card header styling */
[class*="CardHeader"] {
  padding: 1.5rem 1.5rem 0.5rem;
}

/* Card title styling */
[class*="CardTitle"] {
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
}

/* Card description styling */
[class*="CardDescription"] {
  color: #666;
  font-size: 1rem;
  line-height: 1.5;
}

/* Card content styling */
[class*="CardContent"] {
  padding: 1.5rem;
}

/* Form fields styling */
.grid {
  display: grid;
  gap: 1.5rem;
}

/* Form field label styling */
label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #444;
}

/* Form input styling */
input, select, textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

input:focus, select:focus, textarea:focus {
  border-color: #4f46e5;
  outline: none;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
}

/* Button styling */
button {
  font-weight: 600;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  transition: all 0.2s ease;
}

/* Primary button */
[class*="Button"]:not([class*="outline"]) {
  background-color: #4f46e5;
  color: white;
}

[class*="Button"]:not([class*="outline"]):hover {
  background-color: #4338ca;
}

/* Outline button */
[class*="Button"][class*="outline"] {
  background-color: transparent;
  border: 1px solid #e2e8f0;
  color: #4f46e5;
}

[class*="Button"][class*="outline"]:hover {
  background-color: #f8fafc;
  border-color: #4f46e5;
}

/* Form progress */
.progress-bar {
  height: 0.5rem;
  background-color: #e2e8f0;
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 2rem;
}

.progress-bar-fill {
  height: 100%;
  background-color: #4f46e5;
  transition: width 0.3s ease;
}

/* Required field indicator */
.required {
  color: #ef4444;
  margin-left: 0.25rem;
}
`,
    isGlobal: false,
    formId: formId
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch existing styles for this form
  useEffect(() => {
    const fetchFormStyles = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/form-styles?formId=${formId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch styles: ${response.statusText}`);
        }
        
        const styles = await response.json();
        console.log(`[FormStyleEditor] Fetched ${styles.length} styles for form ${formId}`);
        
        // Filter to only include styles for this specific form (not global)
        const formSpecificStyles = styles.filter((s: FormStyle) => s.formId === formId);
        setFormStyles(formSpecificStyles);
        
        // If we have a style for this form, set it as current
        if (formSpecificStyles.length > 0) {
          setCurrentStyle(formSpecificStyles[0]);
        }
      } catch (error) {
        console.error('[FormStyleEditor] Error fetching styles:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch styles');
      } finally {
        setLoading(false);
      }
    };
    
    if (formId) {
      fetchFormStyles();
    }
  }, [formId]);

  // Generate preview HTML
  useEffect(() => {
    // Basic form HTML for preview
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Form Preview - ${formName}</title>
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
          
          /* Custom CSS */
          ${currentStyle.cssContent}
        </style>
      </head>
      <body>
        <div class="form-container">
          <div class="form-header">
            <h1 class="form-title">${formName}</h1>
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
    
    // Set preview URL
    setPreviewUrl(`/forms2/${formId}/view?preview=true`);
  }, [currentStyle.cssContent, formId, formName]);

  // Save the current style
  const handleSave = async () => {
    try {
      if (!currentStyle.name) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a name for the style',
          variant: 'destructive',
        });
        return;
      }

      setSaving(true);
      setError(null);
      
      // Determine if we're creating a new style or updating an existing one
      const isNew = !currentStyle.id;
      const url = isNew ? '/api/form-styles' : `/api/form-styles/${currentStyle.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...currentStyle,
          formId: formId, // Ensure the formId is set correctly
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isNew ? 'create' : 'update'} style`);
      }

      const savedStyle = await response.json();
      
      // Update the current style with the saved data
      setCurrentStyle(savedStyle);
      
      // If this was a new style, add it to the list
      if (isNew) {
        setFormStyles([...formStyles, savedStyle]);
      } else {
        // Update the style in the list
        setFormStyles(formStyles.map(s => s.id === savedStyle.id ? savedStyle : s));
      }
      
      setSuccessMessage(`Style ${isNew ? 'created' : 'updated'} successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      toast({
        title: 'Success',
        description: `Style ${isNew ? 'created' : 'updated'} successfully!`,
      });
    } catch (error) {
      console.error('[FormStyleEditor] Error saving style:', error);
      setError(error instanceof Error ? error.message : 'Failed to save style');
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save style',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // View the form with the current style
  const handlePreview = () => {
    window.open(previewUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Success message */}
      {successMessage && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* Style information */}
      <Card>
        <CardHeader>
          <CardTitle>Form Style</CardTitle>
          <CardDescription>
            Customize the appearance of your form with custom CSS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Style Name</Label>
                <Input
                  id="name"
                  value={currentStyle.name}
                  onChange={(e) => setCurrentStyle({ ...currentStyle, name: e.target.value })}
                  placeholder="Enter a name for this style"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={currentStyle.description || ''}
                onChange={(e) => setCurrentStyle({ ...currentStyle, description: e.target.value })}
                placeholder="Enter a description for this style"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for editor and preview */}
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
                Write custom CSS to style your form. Changes will be reflected in the preview.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeEditor
                value={currentStyle.cssContent}
                onChange={(value) => setCurrentStyle({ ...currentStyle, cssContent: value })}
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
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[600px] overflow-auto border rounded-md">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title="Form Preview"
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handlePreview} variant="outline" className="mr-2">
                <Eye className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="flex justify-end space-x-2">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Style'}
        </Button>
      </div>
    </div>
  );
}
