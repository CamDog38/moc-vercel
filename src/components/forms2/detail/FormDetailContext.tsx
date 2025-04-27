/**
 * Form Detail Context
 * 
 * This context provides state management for the form detail page.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { Form2Model, FormConfig } from '@/lib/forms2/core/types';

// Define a type for error that can be either string, object, or null
type ErrorType = string | Record<string, any> | null;

interface FormDetailContextType {
  form: Form2Model | null;
  formConfig: FormConfig | null;
  loading: boolean;
  saving: boolean;
  error: ErrorType;
  successMessage: string | null;
  activeTab: string;
  hasUnsavedChanges: boolean;
  setForm: (form: Form2Model) => void;
  setFormConfig: (config: FormConfig) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: ErrorType) => void;
  setSuccessMessage: (message: string | null) => void;
  setActiveTab: (tab: string) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  loadFormData: (id: string) => Promise<void>;
  saveFormConfig: () => Promise<void>;
  handleFormConfigChange: (updatedConfig: FormConfig) => void;
}

const FormDetailContext = createContext<FormDetailContextType | undefined>(undefined);

export function useFormDetail() {
  const context = useContext(FormDetailContext);
  if (!context) {
    throw new Error('useFormDetail must be used within a FormDetailProvider');
  }
  return context;
}

interface FormDetailProviderProps {
  children: ReactNode;
  formId: string;
}

export function FormDetailProvider({ children, formId }: FormDetailProviderProps) {
  const [form, setForm] = useState<Form2Model | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ErrorType>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('settings');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load form data
  const loadFormData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/api/forms2/${id}`);
      const formData = response.data;
      
      console.log('Form data loaded:', formData);
      
      // Set the form state to the form property from the response
      if (formData.form) {
        console.log('Setting form state from formData.form');
        setForm(formData.form);
      } else {
        // Fallback to the entire response if form property doesn't exist
        console.log('Setting form state from entire formData');
        setForm(formData);
      }
      
      // Handle different possible structures of the API response for formConfig
      if (formData.formConfig) {
        // If formConfig is in the response
        console.log('Using formData.formConfig');
        setFormConfig(formData.formConfig);
      } else if (formData.form && formData.form.config) {
        // If nested under form.config
        console.log('Using formData.form.config');
        setFormConfig(formData.form.config);
      } else if (formData.config) {
        // If config is directly in the response
        console.log('Using formData.config');
        setFormConfig(formData.config);
      } else {
        // If we need to parse from a fields JSON string
        console.log('No config found, checking for fields JSON');
        try {
          if (formData.fields && typeof formData.fields === 'string') {
            const parsedFields = JSON.parse(formData.fields);
            if (parsedFields.formConfig) {
              console.log('Found config in parsed fields');
              setFormConfig(parsedFields.formConfig);
            }
          }
        } catch (parseErr) {
          console.error('Error parsing fields JSON:', parseErr);
        }
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading form data:', err);
      console.log('Error object type:', typeof err);
      console.log('Error object:', err);
      if (err.response) {
        console.log('Error response:', err.response);
        console.log('Error response data:', err.response.data);
      }
      
      // Use a string error message instead of passing the error object directly
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load form data';
      console.log('Setting error to:', errorMessage);
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Save form config
  const saveFormConfig = async () => {
    if (!form || !formConfig) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      // Prepare the form data
      const formData = {
        name: formConfig.title,
        description: formConfig.description || '',
        type: form.type || 'INQUIRY', // Include the form type (INQUIRY or BOOKING)
        isMultiPage: formConfig.isMultiPage || false,
        isPublic: formConfig.isPublic || false, // Include the isPublic flag
        submitButtonText: formConfig.submitButtonText || 'Submit',
        successMessage: formConfig.successMessage || 'Thank you for your submission!',
        fields: JSON.stringify(formConfig),
        metadata: formConfig.metadata || {},
        formConfig: formConfig // Include the full formConfig object for section/field updates
      };
      
      console.log('isPublic value being saved:', formConfig.isPublic);
      
      console.log('Saving form with data:', formData);
      console.log('Sending formConfig to API:', formConfig);
      
      // Send the request to update the form
      // Make sure we're explicitly passing formConfig as a separate property
      const response = await axios.put(`/api/forms2/${formId}`, {
        ...formData,
        formConfig: formConfig // Explicitly pass the formConfig object
      });
      
      console.log('Form saved successfully:', response.data);
      
      // Update the form state with the response data
      setForm(response.data);
      
      // Reset the hasUnsavedChanges flag
      setHasUnsavedChanges(false);
      
      // Show success message
      setSuccessMessage('Form saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      setSaving(false);
    } catch (err: any) {
      console.error('Error saving form:', err);
      console.log('Save error object type:', typeof err);
      console.log('Save error object:', err);
      if (err.response) {
        console.log('Save error response:', err.response);
        console.log('Save error response data:', err.response.data);
      }
      
      // Use a string error message instead of passing the error object directly
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save form';
      console.log('Setting save error to:', errorMessage);
      setError(errorMessage);
      setSaving(false);
    }
  };

  // Handle form config changes
  const handleFormConfigChange = (updatedConfig: FormConfig) => {
    console.log('Form config change detected');
    
    // Deep comparison to check if sections or fields have changed
    const hasChanges = JSON.stringify(updatedConfig) !== JSON.stringify(formConfig);
    console.log('Has changes:', hasChanges);
    
    if (hasChanges) {
      console.log('Updating form config with changes');
      setFormConfig(updatedConfig);
      
      // Also update the form object to keep isMultiPage in sync
      if (form && updatedConfig.isMultiPage !== form.isMultiPage) {
        setForm({
          ...form,
          isMultiPage: updatedConfig.isMultiPage,
          metadata: {
            ...form.metadata,
            isMultiPage: updatedConfig.isMultiPage
          }
        });
      }
      
      // Mark that we have unsaved changes
      setHasUnsavedChanges(true);
    }
  };

  // Load form data on initial render
  useEffect(() => {
    if (formId) {
      loadFormData(formId);
    }
  }, [formId]);

  const value = {
    form,
    formConfig,
    loading,
    saving,
    error,
    successMessage,
    activeTab,
    hasUnsavedChanges,
    setForm,
    setFormConfig,
    setLoading,
    setSaving,
    setError,
    setSuccessMessage,
    setActiveTab,
    setHasUnsavedChanges,
    loadFormData,
    saveFormConfig,
    handleFormConfigChange
  };

  return (
    <FormDetailContext.Provider value={value}>
      {children}
    </FormDetailContext.Provider>
  );
}
