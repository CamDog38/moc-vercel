import { EmailRule, Condition, FormField, Form, EmailTemplate } from './types';

export async function fetchEmailRule(id: string): Promise<EmailRule | null> {
  try {
    const response = await fetch(`/api/emails/rules/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch rule');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching rule:', error);
    throw error;
  }
}

export async function fetchEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    const response = await fetch('/api/emails');
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
}

// Legacy forms function removed - only using Form System 2.0

export async function fetchForms2(): Promise<Form[]> {
  try {
    const response = await fetch('/api/forms2');
    if (!response.ok) {
      throw new Error('Failed to fetch Form System 2.0 forms');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching Form System 2.0 forms:', error);
    throw error;
  }
}

export async function fetchFormFields(id: string, useFormSystem2: boolean = true): Promise<FormField[]> {
  try {
    const endpoint = `/api/forms2/${id}`;
    console.log(`Fetching form fields from: ${endpoint}`);
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      console.error(`Failed to fetch form details from ${endpoint}:`, response.status, response.statusText);
      throw new Error(`Failed to fetch form details: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    
    console.log('Form data received:', data);
    console.log('Data structure:', Object.keys(data));
    console.log('Form ID:', id);
    console.log('Using Form System 2.0:', useFormSystem2);
    
    // Extract all fields from all sections
    const fields: FormField[] = [];
    
    // Define common fields to add only if they don't exist in the form data
    const commonFields = [
      { id: 'name', label: 'Name', type: 'text', stableId: 'name' },
      { id: 'email', label: 'Email', type: 'email', stableId: 'email' },
      { id: 'phone', label: 'Phone', type: 'tel', stableId: 'phone' }
    ];
    
    console.log('Common fields to potentially add:', commonFields);
    
    // We'll add these later after processing the form data to avoid conflicts
    
    if (useFormSystem2) {
      console.log('Handling Form System 2.0 structure');
      console.log('Form data structure:', JSON.stringify(data, null, 2));
      
      // Check for both possible data structures
      const formConfig = data.formConfig || data.config;
      const formData = data.form || data;
      
      console.log('Form config:', formConfig);
      console.log('Form data:', formData);
      
      // Try to extract sections from different possible structures
      const sections = formConfig?.sections || formData?.config?.sections || formData?.sections || [];
      
      console.log('Extracted sections:', sections);
      console.log('Number of sections found:', sections.length);
      
      if (sections && sections.length > 0) {
        console.log('Processing Form 2.0 sections:', sections.length);
        console.log('Sections data:', JSON.stringify(sections.map((s: any) => ({ id: s.id, title: s.title })), null, 2));
        
        sections.forEach((section: any, sectionIndex: number) => {
          console.log(`Processing section ${sectionIndex + 1}/${sections.length}: ${section.title || 'Untitled Section'}`);
          
          if (section.fields && Array.isArray(section.fields)) {
            console.log(`Section has ${section.fields.length} fields`);
            
            section.fields.forEach((field: any, fieldIndex: number) => {
              console.log(`Processing field ${fieldIndex + 1}/${section.fields.length}: ${field.id}`);
              console.log('Field data:', JSON.stringify(field, null, 2));
              
              // Skip fields that are already in the common fields
              if (!fields.some(f => f.id === field.id)) {
                console.log('Processing field:', field.id, field.label, field.type);
                
                let fieldOptions: string[] | undefined = undefined;
                let originalOptions: any[] | undefined = undefined;
                
                // Handle different formats of options
                if (field.options) {
                  console.log(`Field ${field.id} has options of type:`, typeof field.options);
                  console.log('Raw options:', field.options);
                  
                  try {
                    if (typeof field.options === 'string') {
                      console.log('Parsing options from string...');
                      const parsedOptions = JSON.parse(field.options);
                      console.log('Parsed options from string:', parsedOptions);
                      
                      if (Array.isArray(parsedOptions)) {
                        originalOptions = parsedOptions;
                        fieldOptions = parsedOptions.map((opt: any, i: number) => {
                          console.log(`Processing option ${i + 1}:`, opt);
                          if (typeof opt === 'string') return opt;
                          const result = opt.value || opt.label || String(opt);
                          console.log(`Option ${i + 1} result:`, result);
                          return result;
                        });
                      }
                    } else if (Array.isArray(field.options)) {
                      console.log('Processing array options...');
                      originalOptions = field.options;
                      fieldOptions = field.options.map((opt: any, i: number) => {
                        console.log(`Processing option ${i + 1}:`, opt);
                        if (typeof opt === 'string') return opt;
                        const result = opt.value || opt.label || String(opt);
                        console.log(`Option ${i + 1} result:`, result);
                        return result;
                      });
                    } else if (typeof field.options === 'object') {
                      console.log('Processing object options...');
                      const optionsArray = Object.values(field.options);
                      console.log('Options array:', optionsArray);
                      originalOptions = optionsArray;
                      fieldOptions = optionsArray.map((opt: any, i: number) => {
                        console.log(`Processing option ${i + 1}:`, opt);
                        if (typeof opt === 'string') return opt;
                        const result = opt.value || opt.label || String(opt);
                        console.log(`Option ${i + 1} result:`, result);
                        return result;
                      });
                    }
                    
                    console.log('Processed options for field', field.id, ':', fieldOptions);
                    console.log('Original options for field', field.id, ':', originalOptions);
                  } catch (e) {
                    console.error('Error processing options for field', field.id, ':', e);
                  }
                } else {
                  console.log(`Field ${field.id} has no options`);
                }
                
                // For dropdown/select fields, ensure we have the type set correctly
                const fieldType = field.type === 'dropdown' || field.type === 'select' || 
                                field.type === 'radio' || field.type === 'checkbox' || 
                                (field.options && (fieldOptions?.length || 0) > 0) ? 'select' : field.type;
                
                console.log(`Field ${field.id} final type:`, fieldType);
                
                // Generate a stable ID for the field
                const stableId = field.stableId || generateStableId(field);
                
                fields.push({
                  id: field.id,
                  label: field.label || field.name || 'Unnamed Field',
                  type: fieldType,
                  key: field.id,
                  stableId: stableId,
                  options: fieldOptions,
                  originalOptions: originalOptions
                });
                
                console.log(`Added field ${field.id} to fields array with stableId: ${stableId}. Total fields:`, fields.length);
              } else {
                console.log(`Skipping field ${field.id} as it already exists in common fields`);
              }
            });
          } else {
            console.log('Section has no fields or fields is not an array:', section.fields);
          }
        });
      } else {
        console.log('No sections found in Form System 2.0 data or invalid structure');
        console.log('Data structure:', data);
      }
    } else {
      // Handle legacy form structure
      if (data.formSections && data.formSections.length > 0) {
        console.log('Processing legacy form sections:', data.formSections.length);
        
        data.formSections.forEach((section: any) => {
          if (section.fields && Array.isArray(section.fields)) {
            section.fields.forEach((field: any) => {
              // Process options for legacy forms
              let fieldOptions: string[] | undefined = undefined;
              
              if (field.options) {
                try {
                  if (typeof field.options === 'string') {
                    fieldOptions = field.options.split(',').map((opt: string) => opt.trim());
                  } else if (Array.isArray(field.options)) {
                    fieldOptions = field.options.map((opt: any) => {
                      if (typeof opt === 'string') return opt;
                      return opt.label || opt.value || String(opt);
                    });
                  }
                } catch (e) {
                  console.error('Error processing legacy options:', e);
                }
              }
              
              // Generate a stable ID for the field
              const stableId = field.stableId || generateStableId(field);
              
              // Use the field ID as the key for condition matching
              fields.push({
                id: field.id,
                label: field.label || 'Unnamed Field',
                type: field.type === 'dropdown' || field.type === 'select' ? 'select' : field.type,
                key: field.id,
                stableId: stableId,
                options: fieldOptions
              });
            });
          }
        });
      }
    }
    
    console.log('Processed fields before adding common fields:', fields);
    
    // Now add common fields only if they don't already exist in the form data
    commonFields.forEach(commonField => {
      // Check if this common field already exists in the processed fields
      const fieldExists = fields.some(f => 
        f.id === commonField.id || 
        f.stableId === commonField.stableId || 
        f.label.toLowerCase() === commonField.label.toLowerCase()
      );
      
      if (!fieldExists) {
        console.log(`Adding common field ${commonField.label} because it doesn't exist in the form`);
        fields.push(commonField);
      } else {
        console.log(`Not adding common field ${commonField.label} because it already exists in the form`);
      }
    });
    
    console.log('Final processed fields after adding common fields:', fields);
    return fields;
  } catch (error) {
    console.error('Error fetching form fields:', error);
    throw error;
  }
}

export async function createEmailRule(ruleData: any): Promise<void> {
  try {
    const response = await fetch('/api/emails/rules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ruleData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create rule');
    }
  } catch (error) {
    console.error('Error creating rule:', error);
    throw error;
  }
}

export async function updateEmailRule(id: string, ruleData: any): Promise<void> {
  try {
    const response = await fetch(`/api/emails/rules/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ruleData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update rule');
    }
  } catch (error) {
    console.error('Error updating rule:', error);
    throw error;
  }
}

export async function deleteEmailRule(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/emails/rules/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete rule');
    }
  } catch (error) {
    console.error('Error deleting rule:', error);
    throw error;
  }
}

export function parseConditions(conditionsData: any): Condition[] {
  try {
    // Check if conditions is already a string or an object
    let parsedConditions: any;
    
    if (typeof conditionsData === 'string') {
      try {
        parsedConditions = JSON.parse(conditionsData);
      } catch (e) {
        console.warn('Failed to parse conditions string:', e);
        parsedConditions = [];
      }
    } else if (typeof conditionsData === 'object' && conditionsData !== null) {
      parsedConditions = conditionsData;
    } else {
      parsedConditions = [];
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Parsed conditions:', parsedConditions);
    }
    
    if (Array.isArray(parsedConditions) && parsedConditions.length > 0) {
      // Map conditions and ensure each has an ID
      return parsedConditions.map((c: any, index: number) => ({
        ...c,
        id: c.id || (index + 1).toString()
      }));
    } else if (typeof parsedConditions === 'object' && !Array.isArray(parsedConditions) && Object.keys(parsedConditions).length > 0) {
      // Handle case where conditions is an object but not an array
      return Object.entries(parsedConditions).map(([key, value]: [string, any], index: number) => ({
        id: (index + 1).toString(),
        field: key,
        operator: 'equals',
        value: String(value)
      }));
    } else {
      // Default to empty condition
      return [];
    }
  } catch (parseError) {
    console.error('Error processing conditions:', parseError);
    return [];
  }
}

// Helper function to generate a stable ID for a field
function generateStableId(field: any): string {
  // If the field already has a stableId, use it
  if (field.stableId) {
    return field.stableId;
  }
  
  // Generate a stable ID based on field properties
  if (field.mapping) {
    return field.mapping;
  }
  
  // Use field type for common field types
  if (field.type === 'email') {
    return 'email';
  }
  if (field.type === 'tel' || field.type === 'phone') {
    return 'phone';
  }
  if (field.type === 'name') {
    return 'name';
  }
  
  // Use label-based identification for common fields
  if (field.label) {
    const label = field.label.toLowerCase();
    if (label.includes('email')) {
      return 'email';
    }
    if (label.includes('phone') || label.includes('tel')) {
      return 'phone';
    }
    if (label === 'name' || label === 'full name') {
      return 'name';
    }
    if (label.includes('first name')) {
      return 'firstName';
    }
    if (label.includes('last name')) {
      return 'lastName';
    }
    if (label.includes('company')) {
      return 'company';
    }
    
    // Generate a camelCase version of the label as fallback
    return field.label.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_: string, char: string) => char.toUpperCase());
  }
  
  // Fallback to using the field ID
  return field.id;
}

export function detectFormSystem2(data: EmailRule): boolean {
  // Always return true since we're only using Form System 2.0 now
  return true;
}

export function cleanDescription(description: string): string {
  // Remove the metadata from the description for display
  return description.replace(/^\[FORM_SYSTEM:[^\]]+\]\s*/, '');
}
