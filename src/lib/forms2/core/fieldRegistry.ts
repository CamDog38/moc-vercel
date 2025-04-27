/**
 * Form System 2.0 Field Registry
 * 
 * This file contains the registry for field types and their configurations.
 */

import { FieldType, FieldConfig } from './types';

/**
 * Field Registry Entry
 */
interface FieldRegistryEntry {
  type: FieldType;
  displayName: string;
  description: string;
  icon: string;
  defaultConfig: (id: string) => Partial<FieldConfig>;
  validate?: (value: any, config: FieldConfig) => string | undefined;
}

/**
 * Field Registry Class
 * 
 * Manages the registration and retrieval of field types
 */
class FieldRegistryClass {
  private registry: Map<FieldType, FieldRegistryEntry> = new Map();

  /**
   * Register a field type
   */
  register(entry: FieldRegistryEntry): void {
    this.registry.set(entry.type, entry);
  }

  /**
   * Get a field type entry
   */
  get(type: FieldType): FieldRegistryEntry | undefined {
    return this.registry.get(type);
  }

  /**
   * Get all registered field types
   */
  getAll(): FieldRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get all registered field type names
   */
  getTypes(): FieldType[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Create a default configuration for a field type
   */
  createDefaultConfig(type: FieldType, id: string): Partial<FieldConfig> {
    const entry = this.get(type);
    if (!entry) {
      throw new Error(`Field type "${type}" is not registered`);
    }
    return entry.defaultConfig(id);
  }

  /**
   * Validate a field value against its configuration
   */
  validate(value: any, config: FieldConfig): string | undefined {
    const entry = this.get(config.type);
    if (!entry || !entry.validate) {
      return undefined;
    }
    return entry.validate(value, config);
  }
}

/**
 * Field Registry Singleton
 */
export const FieldRegistry = new FieldRegistryClass();

/**
 * Register default field types
 */

// Text Field
FieldRegistry.register({
  type: 'text',
  displayName: 'Text',
  description: 'Single line text input',
  icon: 'text-icon',
  defaultConfig: (id) => ({
    id,
    type: 'text',
    name: `text_${id}`,
    label: 'Text Field',
    placeholder: 'Enter text',
  }),
  validate: (value, config) => {
    if (config.required && (!value || value === '')) {
      return typeof config.required === 'string' 
        ? config.required 
        : 'This field is required';
    }
    return undefined;
  },
});

// Email Field
FieldRegistry.register({
  type: 'email',
  displayName: 'Email',
  description: 'Email address input',
  icon: 'email-icon',
  defaultConfig: (id) => ({
    id,
    type: 'email',
    name: `email_${id}`,
    label: 'Email Field',
    placeholder: 'Enter email address',
  }),
  validate: (value, config) => {
    if (config.required && (!value || value === '')) {
      return typeof config.required === 'string' 
        ? config.required 
        : 'This field is required';
    }
    
    if (value && value !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }
    
    return undefined;
  },
});

// Telephone Field
FieldRegistry.register({
  type: 'tel',
  displayName: 'Phone',
  description: 'Phone number input',
  icon: 'phone-icon',
  defaultConfig: (id) => ({
    id,
    type: 'tel',
    name: `phone_${id}`,
    label: 'Phone Field',
    placeholder: 'Enter phone number',
  }),
  validate: (value, config) => {
    if (config.required && (!value || value === '')) {
      return typeof config.required === 'string' 
        ? config.required 
        : 'This field is required';
    }
    
    if (value && value !== '') {
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(value.replace(/[^0-9+]/g, ''))) {
        return 'Please enter a valid phone number';
      }
    }
    
    return undefined;
  },
});

// Number Field
FieldRegistry.register({
  type: 'number',
  displayName: 'Number',
  description: 'Numeric input',
  icon: 'number-icon',
  defaultConfig: (id) => ({
    id,
    type: 'number',
    name: `number_${id}`,
    label: 'Number Field',
    placeholder: 'Enter a number',
  }),
  validate: (value, config) => {
    if (config.required && (value === undefined || value === null || value === '')) {
      return typeof config.required === 'string' 
        ? config.required 
        : 'This field is required';
    }
    
    if (value !== undefined && value !== null && value !== '') {
      const num = parseFloat(value);
      
      if (isNaN(num)) {
        return 'Please enter a valid number';
      }
      
      const numConfig = config as any;
      
      if (numConfig.min !== undefined && num < numConfig.min) {
        return `Value must be at least ${numConfig.min}`;
      }
      
      if (numConfig.max !== undefined && num > numConfig.max) {
        return `Value must be at most ${numConfig.max}`;
      }
    }
    
    return undefined;
  },
});

// Date Field
FieldRegistry.register({
  type: 'date',
  displayName: 'Date',
  description: 'Date picker',
  icon: 'date-icon',
  defaultConfig: (id) => ({
    id,
    type: 'date',
    name: `date_${id}`,
    label: 'Date Field',
    placeholder: 'Select a date',
  }),
  validate: (value, config) => {
    if (config.required && (!value || value === '')) {
      return typeof config.required === 'string' 
        ? config.required 
        : 'This field is required';
    }
    
    if (value && value !== '') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return 'Please enter a valid date';
      }
      
      const dateConfig = config as any;
      
      if (dateConfig.min) {
        const minDate = new Date(dateConfig.min);
        if (date < minDate) {
          return `Date must be on or after ${dateConfig.min}`;
        }
      }
      
      if (dateConfig.max) {
        const maxDate = new Date(dateConfig.max);
        if (date > maxDate) {
          return `Date must be on or before ${dateConfig.max}`;
        }
      }
    }
    
    return undefined;
  },
});

// Select Field
FieldRegistry.register({
  type: 'select',
  displayName: 'Dropdown',
  description: 'Dropdown select',
  icon: 'select-icon',
  defaultConfig: (id) => ({
    id,
    type: 'select',
    name: `select_${id}`,
    label: 'Select Field',
    placeholder: 'Select an option',
    options: [
      { id: 'option1', label: 'Option 1', value: 'option1' },
      { id: 'option2', label: 'Option 2', value: 'option2' },
    ],
  }),
  validate: (value, config) => {
    if (config.required && (!value || value === '')) {
      return typeof config.required === 'string' 
        ? config.required 
        : 'This field is required';
    }
    
    return undefined;
  },
});

// Add more field types as needed...
