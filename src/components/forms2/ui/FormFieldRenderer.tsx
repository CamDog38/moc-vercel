/**
 * Form Field Renderer Component
 * 
 * This component renders a form field for user input based on its configuration.
 * It's used in the form renderer to display fields to end users.
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FieldConfig } from '@/lib/forms2/core/types';

export interface FormFieldRendererProps {
  config: FieldConfig;
  defaultValue?: any;
  errorMessage?: string;
  onValueChange: (value: any) => void;
  disabled?: boolean;
}

export default function FormFieldRenderer({
  config,
  defaultValue,
  errorMessage,
  onValueChange,
  disabled = false
}: FormFieldRendererProps) {
  const { 
    id, 
    type, 
    label, 
    placeholder, 
    helpText, 
    required 
  } = config;
  
  // Extract field-specific props based on type
  const renderField = () => {
    switch (type) {
      case 'text':
        return (
          <Input
            id={id}
            type="text"
            value={defaultValue || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onValueChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={errorMessage ? 'border-destructive' : ''}
          />
        );
        
      case 'textarea':
        return (
          <Textarea
            id={id}
            value={defaultValue || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onValueChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={errorMessage ? 'border-destructive' : ''}
            rows={4}
          />
        );
        
      case 'email':
        return (
          <Input
            id={id}
            type="email"
            value={defaultValue || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onValueChange(e.target.value)}
            placeholder={placeholder || 'email@example.com'}
            disabled={disabled}
            required={required}
            className={errorMessage ? 'border-destructive' : ''}
          />
        );
        
      case 'tel':
        return (
          <Input
            id={id}
            type="tel"
            value={defaultValue || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onValueChange(e.target.value)}
            placeholder={placeholder || '(123) 456-7890'}
            disabled={disabled}
            required={required}
            className={errorMessage ? 'border-destructive' : ''}
          />
        );
        
      case 'number':
        return (
          <Input
            id={id}
            type="number"
            value={defaultValue || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onValueChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={errorMessage ? 'border-destructive' : ''}
            min={(config as any).min}
            max={(config as any).max}
            step={(config as any).step}
          />
        );
        
      case 'date':
      case 'datetime':
      case 'datetime-local':
      case 'dob':
      case 'time':
        return (
          <Input
            id={id}
            type={type === 'datetime' ? 'datetime-local' : type === 'dob' ? 'date' : type}
            value={defaultValue || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onValueChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={errorMessage ? 'border-destructive' : ''}
            min={(config as any).min}
            max={(config as any).max}
          />
        );
        
      case 'checkbox':
        if ((config as any).options && (config as any).options.length > 0) {
          // Multiple checkboxes
          return (
            <div className="space-y-2">
              {(config as any).options.map((option: any) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${id}-${option.value}`}
                    checked={Array.isArray(defaultValue) ? defaultValue.includes(option.value) : false}
                    onCheckedChange={(checked: boolean) => {
                      if (Array.isArray(defaultValue)) {
                        if (checked) {
                          onValueChange([...defaultValue, option.value]);
                        } else {
                          onValueChange(defaultValue.filter((val: string) => val !== option.value));
                        }
                      } else {
                        onValueChange(checked ? [option.value] : []);
                      }
                    }}
                    disabled={disabled}
                  />
                  <Label htmlFor={`${id}-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </div>
          );
        } else {
          // Single checkbox
          return (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={id}
                checked={!!defaultValue}
                onCheckedChange={(checked: boolean) => onValueChange(checked)}
                disabled={disabled}
              />
              <Label htmlFor={id}>{label}</Label>
            </div>
          );
        }
        
      case 'radio':
        if ((config as any).options && (config as any).options.length > 0) {
          return (
            <RadioGroup
              value={defaultValue || ''}
              onValueChange={onValueChange}
              disabled={disabled}
            >
              <div className="space-y-2">
                {(config as any).options.map((option: any) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
                    <Label htmlFor={`${id}-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          );
        }
        return null;
        
      case 'select':
      case 'multiselect':
        if ((config as any).options && (config as any).options.length > 0) {
          return (
            <Select
              value={defaultValue || ''}
              onValueChange={onValueChange}
              disabled={disabled}
            >
              <SelectTrigger id={id} className={errorMessage ? 'border-destructive' : ''}>
                <SelectValue placeholder={placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {(config as any).options.map((option: any) => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return null;
        
      case 'file':
        return (
          <div>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
              type="button"
              onClick={() => document.getElementById(`${id}-file`)?.click()}
              disabled={disabled}
            >
              <input
                id={`${id}-file`}
                type="file"
                className="hidden"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  if (e.target.files && e.target.files[0]) {
                    onValueChange(e.target.files[0]);
                  }
                }}
                required={required}
                accept={(config as any).accept}
                multiple={(config as any).multiple}
                disabled={disabled}
              />
              {defaultValue ? 
                typeof defaultValue === 'object' ? (defaultValue as File).name : defaultValue 
                : placeholder || 'Upload file'}
            </Button>
          </div>
        );
        
      case 'hidden':
        return (
          <input
            type="hidden"
            id={id}
            value={defaultValue || ''}
            name={config.name}
          />
        );
        
      default:
        return (
          <Input
            id={id}
            type="text"
            value={defaultValue || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onValueChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={errorMessage ? 'border-destructive' : ''}
          />
        );
    }
  };
  
  // For hidden fields, just render the input without label or container
  if (type === 'hidden') {
    return renderField();
  }
  
  return (
    <div className="space-y-2">
      {/* Don't show label for single checkbox as it's shown next to the checkbox */}
      {!(type === 'checkbox' && !((config as any).options && (config as any).options.length > 0)) && (
        <Label htmlFor={id}>
          {label}{required && ' *'}
        </Label>
      )}
      
      {renderField()}
      
      {(errorMessage || helpText) && (
        <p className={`text-xs ${errorMessage ? 'text-destructive' : 'text-muted-foreground'}`}>
          {errorMessage || helpText}
        </p>
      )}
    </div>
  );
}
