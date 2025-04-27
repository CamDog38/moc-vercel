/**
 * Form Settings Component
 * 
 * This component displays and manages the form settings.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useFormDetail } from './FormDetailContext';

export default function FormSettings() {
  const { 
    form, 
    formConfig, 
    loading,
    setHasUnsavedChanges,
    setFormConfig
  } = useFormDetail();

  if (loading || !formConfig) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    if (!formConfig) return;
    
    setFormConfig({
      ...formConfig,
      [field]: value
    });
    
    setHasUnsavedChanges(true);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="form-title">Form Title</Label>
            <Input
              id="form-title"
              value={formConfig.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter form title"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="form-description">Description</Label>
            <Textarea
              id="form-description"
              value={formConfig.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter form description"
              className="mt-1"
            />
          </div>
          
          <Separator />
          
          <div>
            <Label htmlFor="form-submit-text">Submit Button Text</Label>
            <Input
              id="form-submit-text"
              value={formConfig.submitButtonText || 'Submit'}
              onChange={(e) => handleInputChange('submitButtonText', e.target.value)}
              placeholder="Submit"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="form-success-message">Success Message</Label>
            <Textarea
              id="form-success-message"
              value={formConfig.successMessage || 'Thank you for your submission!'}
              onChange={(e) => handleInputChange('successMessage', e.target.value)}
              placeholder="Thank you for your submission!"
              className="mt-1"
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center space-x-2">
            <Switch
              id="form-multi-page"
              checked={formConfig.isMultiPage || false}
              onCheckedChange={(checked) => handleInputChange('isMultiPage', checked)}
            />
            <Label htmlFor="form-multi-page">Multi-page Form</Label>
          </div>
          
          {formConfig.isMultiPage && (
            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Multi-page Form</AlertTitle>
              <AlertDescription>
                Your form will be split into multiple pages based on sections.
                Each section will be displayed as a separate page.
              </AlertDescription>
            </Alert>
          )}
          
          <Separator />
          
          <div className="flex items-center space-x-2">
            <Switch
              id="form-is-public"
              checked={formConfig.isPublic || false}
              onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
            />
            <Label htmlFor="form-is-public">Public Form</Label>
          </div>
          
          {formConfig.isPublic ? (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Public Form</AlertTitle>
              <AlertDescription>
                This form will be accessible to anyone with the link, even if they're not logged in.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-amber-50 text-amber-800 border-amber-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Private Form</AlertTitle>
              <AlertDescription>
                This form will only be accessible to logged-in users. Make it public if you want to share it with clients.
              </AlertDescription>
            </Alert>
          )}
          
          <Separator />
          
          <div className="flex items-center space-x-2">
            <Switch
              id="form-require-login"
              checked={(formConfig as any).requireLogin || false}
              onCheckedChange={(checked) => handleInputChange('requireLogin', checked)}
            />
            <Label htmlFor="form-require-login">Require Login</Label>
          </div>
          
          {(formConfig as any).requireLogin && (
            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Required</AlertTitle>
              <AlertDescription>
                Users will need to log in before they can submit this form.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
