/**
 * Form System 2.0 - Create New Form
 * 
 * This page allows users to create a new form using the Form System 2.0
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { FormConfig, FieldConfig, FormSection, FieldType, FieldMapping, ConditionalLogic } from '@/lib/forms2/core/types';
import { generateId } from '@/lib/forms2/utils/idUtils';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { TopNav } from '@/components/TopNav';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Trash2, MapPin, SlidersHorizontal } from 'lucide-react';
import FieldMappingSelector from '@/components/forms2/FieldMappingSelector';
import ConditionalLogicBuilder from '@/components/forms2/ConditionalLogicBuilder';
import FormBuilder from '@/components/forms2/ui/FormBuilder';

export default function CreateFormPage() {
  return (
    <DashboardLayout>
      <CreateForm />
    </DashboardLayout>
  );
}

function CreateForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, initializing } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'standard',
    isActive: true,
    isPublic: true,
    isMultiStep: false,
    submitButtonText: 'Submit',
    successMessage: 'Thank you for your submission!'
  });
  
  // Form builder state
  const [formConfig, setFormConfig] = useState<FormConfig>({
    id: generateId('form'),
    title: '',
    description: '',
    sections: [
      {
        id: generateId('section'),
        title: 'Form Fields',
        description: '',
        fields: [] as FieldConfig[],
        order: 1
      }
    ],
    version: 'modern',
    isMultiPage: false,
    submitButtonText: 'Submit',
    successMessage: 'Thank you for your submission!'
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast({
        title: "Error",
        description: "Form title is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Update form config with form data
      const updatedFormConfig = {
        ...formConfig,
        title: formData.title,
        description: formData.description,
        isMultiPage: formData.isMultiStep,
        submitButtonText: formData.submitButtonText,
        successMessage: formData.successMessage
      };
      
      // Create the form
      const response = await axios.post('/api/forms2', {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        isActive: formData.isActive,
        isPublic: formData.isPublic,
        submitButtonText: formData.submitButtonText,
        successMessage: formData.successMessage,
        formConfig: updatedFormConfig
      });
      
      toast({
        title: "Success",
        description: "Form created successfully",
      });
      
      // Redirect to the form edit page
      router.push(`/dashboard/forms2/${response.data.id}`);
    } catch (error) {
      console.error('Error creating form:', error);
      toast({
        title: "Error",
        description: "Failed to create form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle boolean toggle changes
  const handleToggleChange = (name: string, value: boolean) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle form config changes
  const handleFormConfigChange = (updatedConfig: FormConfig) => {
    setFormConfig(updatedConfig);
  };
  
  // Show loading state while checking authentication
  if (initializing) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!initializing && !user) {
    router.push('/login');
    return null;
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create Form</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard/forms')}>
          Back to Forms
        </Button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Details</CardTitle>
              <CardDescription>Basic information about your form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Form Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter form title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter form description"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Form Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select form type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="contact">Contact</SelectItem>
                    <SelectItem value="survey">Survey</SelectItem>
                    <SelectItem value="registration">Registration</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="submitButtonText">Submit Button Text</Label>
                <Input
                  id="submitButtonText"
                  name="submitButtonText"
                  value={formData.submitButtonText}
                  onChange={handleChange}
                  placeholder="Submit"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="successMessage">Success Message</Label>
                <Textarea
                  id="successMessage"
                  name="successMessage"
                  value={formData.successMessage}
                  onChange={handleChange}
                  placeholder="Thank you for your submission!"
                  rows={2}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleToggleChange('isActive', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => handleToggleChange('isPublic', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isPublic">Public</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isMultiStep"
                  checked={formData.isMultiStep}
                  onChange={(e) => {
                    handleToggleChange('isMultiStep', e.target.checked);
                    // Also update the form config
                    setFormConfig(prev => ({
                      ...prev,
                      isMultiPage: e.target.checked
                    }));
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isMultiStep">Multi-Step Form</Label>
                {formData.isMultiStep && (
                  <div className="ml-2 text-xs text-muted-foreground">
                    Each section will be displayed as a separate step
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Form Structure</CardTitle>
              <CardDescription>
                Add sections and fields to your form. You can edit them further after creating the form.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <FormBuilder
                formConfig={formConfig}
                onChange={handleFormConfigChange}
                onSave={() => {}} // No-op since saving happens on form submission
                isSaving={isSubmitting}
              />
            </CardContent>
          </Card>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Form System 2.0</AlertTitle>
            <AlertDescription>
              You're creating a form using the new Form System 2.0. After creation, you'll be redirected to the form detail page
              where you can further edit and configure your form.
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/forms')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Form"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
