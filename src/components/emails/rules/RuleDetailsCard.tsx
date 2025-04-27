/**
 * RuleDetailsCard Component - Manages the basic configuration of an email rule
 * 
 * This component provides a user interface for configuring the essential properties of an email rule:
 * - Rule name and description for identification purposes
 * - Email template selection to determine the content of the email
 * - Form selection to specify which form submissions will trigger this rule
 * - Recipient configuration (primary recipient, CC, BCC)
 * - Active/inactive toggle to enable or disable the rule
 * 
 * The component is designed to work with both the original form system and Form System 2.0,
 * with special support for stable IDs to ensure rules remain valid across form changes.
 */

import { Form, EmailTemplate } from './types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { BellRing } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface RuleDetailsCardProps {
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  templateId: string;
  setTemplateId: (value: string) => void;
  formId: string;
  setFormId: (value: string) => void;
  active: boolean;
  setActive: (value: boolean) => void;
  ccEmails: string;
  setCcEmails: (value: string) => void;
  bccEmails: string;
  setBccEmails: (value: string) => void;
  recipientType: string;
  setRecipientType: (value: string) => void;
  recipientEmail: string;
  setRecipientEmail: (value: string) => void;
  recipientField: string;
  setRecipientField: (value: string) => void;
  useFormSystem2?: boolean; // Optional now, always true
  setUseFormSystem2?: (value: boolean) => void; // Optional now, no-op
  templates: EmailTemplate[];
  forms: Form[];
  formFields: any[];
}

export function RuleDetailsCard({
  name,
  setName,
  description,
  setDescription,
  templateId,
  setTemplateId,
  formId,
  setFormId,
  active,
  setActive,
  ccEmails,
  setCcEmails,
  bccEmails,
  setBccEmails,
  recipientType,
  setRecipientType,
  recipientEmail,
  setRecipientEmail,
  recipientField,
  setRecipientField,
  useFormSystem2,
  setUseFormSystem2,
  templates,
  forms,
  formFields
}: RuleDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rule Details</CardTitle>
        <CardDescription>
          Basic information about your email rule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Rule Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Send confirmation for wedding inquiries"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of this rule"
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="template">Email Template *</Label>
          <Select
            value={templateId}
            onValueChange={setTemplateId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="form">Form *</Label>
          </div>
          <Select
            value={formId}
            onValueChange={setFormId}
          >
            <SelectTrigger>
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
        </div>

        <div className="space-y-4 p-4 border rounded-md">
          <h4 className="font-medium flex items-center">
            <BellRing className="h-4 w-4 mr-2" />
            Notification Recipients
          </h4>
          
          <div className="space-y-3">
            <Label>Primary Recipient</Label>
            <RadioGroup value={recipientType} onValueChange={setRecipientType} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="form" id="recipient-form" />
                <Label htmlFor="recipient-form" className="cursor-pointer">Use form submitter's email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="recipient-custom" />
                <Label htmlFor="recipient-custom" className="cursor-pointer">Use custom email address</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="field" id="recipient-field" />
                <Label htmlFor="recipient-field" className="cursor-pointer">Use email from form field</Label>
              </div>
            </RadioGroup>
          </div>

          {recipientType === 'custom' && (
            <div className="space-y-2 mt-2">
              <Label htmlFor="recipientEmail">Notification Email</Label>
              <Input
                id="recipientEmail"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="notifications@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Enter the email address that should receive notifications
              </p>
            </div>
          )}

          {recipientType === 'field' && formId && (
            <div className="space-y-2 mt-2">
              <Label htmlFor="recipientField">Email Field</Label>
              <Select
                value={recipientField}
                onValueChange={setRecipientField}
              >
                <SelectTrigger id="recipientField">
                  <SelectValue placeholder="Select a field" />
                </SelectTrigger>
                <SelectContent>
                  {formFields
                    .filter(field => field.type === 'email' || field.label.toLowerCase().includes('email'))
                    .map(field => (
                      <SelectItem key={field.id} value={field.key || field.id}>
                        {field.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the form field that contains the email address
              </p>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="ccEmails">CC Recipients</Label>
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
          <Label htmlFor="bccEmails">BCC Recipients</Label>
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

        <div className="flex items-center space-x-2 pt-2">
          <Switch
            id="active"
            checked={active}
            onCheckedChange={setActive}
          />
          <Label htmlFor="active">Active</Label>
        </div>
      </CardContent>
    </Card>
  );
}
