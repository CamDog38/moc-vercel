/**
 * Form System 2.0 API - Create Test Form Endpoint
 * 
 * POST: Create a test form with sample sections and fields
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { FormRepository } from '@/lib/forms2/repositories/form/formRepository';
import { generateFieldId, generateSectionId } from '@/lib/forms2/utils/idUtils';
import { FormConfig, FormSection, FieldConfig } from '@/lib/forms2/core/types';

const formRepository = new FormRepository();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // This endpoint is only available in development mode
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const session = await getSession({ req });

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id as string;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create a test form with sample sections and fields
    const testForm: FormConfig = {
      id: 'temp_' + Date.now().toString(),
      title: 'Test Form ' + new Date().toLocaleString(),
      description: 'This is a test form created for development purposes.',
      sections: [
        createContactSection(),
        createPreferencesSection(),
      ],
      isMultiPage: true,
      submitButtonText: 'Submit Test Form',
      successMessage: 'Thank you for submitting the test form!',
      version: 'modern',
    };

    // Save the form to the database
    const form = await formRepository.saveFormConfig(testForm, userId);

    return res.status(201).json({
      message: 'Test form created successfully',
      form,
      formConfig: testForm,
    });
  } catch (error) {
    console.error('Error creating test form:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create a contact information section
 */
function createContactSection(): FormSection {
  return {
    id: generateSectionId(),
    title: 'Contact Information',
    description: 'Please provide your contact details.',
    order: 0,
    fields: [
      createTextField({
        label: 'Full Name',
        name: 'fullName',
        placeholder: 'Enter your full name',
        required: true,
        mapping: {
          type: 'name',
          value: 'name',
        },
      }),
      createEmailField({
        label: 'Email Address',
        name: 'email',
        placeholder: 'Enter your email address',
        required: true,
        mapping: {
          type: 'email',
          value: 'email',
        },
      }),
      createTelField({
        label: 'Phone Number',
        name: 'phone',
        placeholder: 'Enter your phone number',
        required: false,
        mapping: {
          type: 'phone',
          value: 'phone',
        },
      }),
    ],
  };
}

/**
 * Create a preferences section
 */
function createPreferencesSection(): FormSection {
  return {
    id: generateSectionId(),
    title: 'Preferences',
    description: 'Please tell us about your preferences.',
    order: 1,
    fields: [
      createSelectField({
        label: 'Preferred Contact Method',
        name: 'contactMethod',
        placeholder: 'Select your preferred contact method',
        required: true,
        options: [
          { id: 'email', label: 'Email', value: 'email' },
          { id: 'phone', label: 'Phone', value: 'phone' },
          { id: 'text', label: 'Text Message', value: 'text' },
        ],
      }),
      createDateField({
        label: 'Preferred Contact Date',
        name: 'contactDate',
        placeholder: 'Select your preferred contact date',
        required: false,
        mapping: {
          type: 'date',
          value: 'date',
        },
      }),
      createCheckboxField({
        label: 'Interests',
        name: 'interests',
        required: false,
        options: [
          { id: 'product1', label: 'Product 1', value: 'product1' },
          { id: 'product2', label: 'Product 2', value: 'product2' },
          { id: 'product3', label: 'Product 3', value: 'product3' },
        ],
      }),
      createTextareaField({
        label: 'Additional Comments',
        name: 'comments',
        placeholder: 'Enter any additional comments',
        required: false,
      }),
    ],
  };
}

/**
 * Create a text field
 */
function createTextField(options: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  mapping?: any;
}): FieldConfig {
  return {
    id: generateFieldId(),
    type: 'text',
    label: options.label,
    name: options.name,
    placeholder: options.placeholder,
    required: options.required || false,
    mapping: options.mapping,
    stableId: options.name,
  };
}

/**
 * Create an email field
 */
function createEmailField(options: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  mapping?: any;
}): FieldConfig {
  return {
    id: generateFieldId(),
    type: 'email',
    label: options.label,
    name: options.name,
    placeholder: options.placeholder,
    required: options.required || false,
    mapping: options.mapping,
    stableId: options.name,
  };
}

/**
 * Create a telephone field
 */
function createTelField(options: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  mapping?: any;
}): FieldConfig {
  return {
    id: generateFieldId(),
    type: 'tel',
    label: options.label,
    name: options.name,
    placeholder: options.placeholder,
    required: options.required || false,
    mapping: options.mapping,
    stableId: options.name,
  };
}

/**
 * Create a select field
 */
function createSelectField(options: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  options: Array<{ id: string; label: string; value: string }>;
  mapping?: any;
}): FieldConfig {
  return {
    id: generateFieldId(),
    type: 'select',
    label: options.label,
    name: options.name,
    placeholder: options.placeholder,
    required: options.required || false,
    options: options.options,
    mapping: options.mapping,
    stableId: options.name,
  };
}

/**
 * Create a date field
 */
function createDateField(options: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  mapping?: any;
}): FieldConfig {
  return {
    id: generateFieldId(),
    type: 'date',
    label: options.label,
    name: options.name,
    placeholder: options.placeholder,
    required: options.required || false,
    mapping: options.mapping,
    stableId: options.name,
  };
}

/**
 * Create a checkbox field
 */
function createCheckboxField(options: {
  label: string;
  name: string;
  required?: boolean;
  options: Array<{ id: string; label: string; value: string }>;
  mapping?: any;
}): FieldConfig {
  return {
    id: generateFieldId(),
    type: 'checkbox',
    label: options.label,
    name: options.name,
    required: options.required || false,
    options: options.options,
    mapping: options.mapping,
    stableId: options.name,
  };
}

/**
 * Create a textarea field
 */
function createTextareaField(options: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  mapping?: any;
}): FieldConfig {
  return {
    id: generateFieldId(),
    type: 'textarea',
    label: options.label,
    name: options.name,
    placeholder: options.placeholder,
    required: options.required || false,
    mapping: options.mapping,
    stableId: options.name,
  };
}
