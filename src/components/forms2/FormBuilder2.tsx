/**
 * Form Builder 2.0 Component
 * 
 * This component provides a drag-and-drop interface for building forms
 * in the Form System 2.0.
 */

import { useState } from 'react';
import { 
  Box, Paper, Typography, Button, Tabs, Tab, Alert, CircularProgress
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { FormConfig, FieldType } from '@/lib/forms2/core/types';
import FormBuilderSettings from './FormBuilderSettings';
import { FormBuilderContent } from './builder/components';
import { 
  addField, updateField, deleteField,
  addSection, updateSection, deleteSection
} from './builder/handlers';

interface FormBuilder2Props {
  formConfig: FormConfig;
  onChange: (formConfig: FormConfig) => void;
  onSave?: () => void;
  onPreview?: () => void;
  isSaving?: boolean;
  error?: string;
  form?: any; // Form model data
  onUpdateForm?: (updates: any) => void; // Function to update form model
}

export default function FormBuilder2({
  formConfig,
  onChange,
  onSave,
  onPreview,
  isSaving = false,
  error,
  form,
  onUpdateForm
}: FormBuilder2Props) {
  const [activeTab, setActiveTab] = useState<'builder' | 'settings'>('builder');
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  
  // Handle section tab change
  const handleSectionChange = (index: number) => {
    setActiveSectionIndex(index);
  };

  // Add a new section
  const handleAddSection = () => {
    const updatedConfig = addSection(formConfig);
    onChange(updatedConfig);
    
    // Set the new section as active
    setActiveSectionIndex(formConfig.sections.length);
  };

  // Add a new field to a section
  const handleAddField = (type: FieldType, sectionIndex: number) => {
    const updatedConfig = addField(formConfig, type, sectionIndex);
    onChange(updatedConfig);
  };

  // Update a section
  const handleUpdateSection = (sectionIndex: number, updatedSection: any) => {
    const updatedConfig = updateSection(formConfig, sectionIndex, updatedSection);
    onChange(updatedConfig);
  };

  // Update a field
  const handleUpdateField = (sectionIndex: number, fieldIndex: number, updatedField: any) => {
    const updatedConfig = updateField(formConfig, sectionIndex, fieldIndex, updatedField);
    onChange(updatedConfig);
  };

  // Delete a section
  const handleDeleteSection = (sectionIndex: number) => {
    const updatedConfig = deleteSection(formConfig, sectionIndex);
    onChange(updatedConfig);
    
    // Reset active section if the deleted section was active
    if (activeSectionIndex === sectionIndex) {
      setActiveSectionIndex(0);
    } else if (activeSectionIndex > sectionIndex) {
      // If we deleted a section before the active one, adjust the index
      setActiveSectionIndex(activeSectionIndex - 1);
    }
  };

  // Delete a field
  const handleDeleteField = (sectionIndex: number, fieldIndex: number) => {
    const updatedConfig = deleteField(formConfig, sectionIndex, fieldIndex);
    onChange(updatedConfig);
  };

  // Update form settings
  const handleUpdateSettings = (updatedConfig: FormConfig) => {
    onChange(updatedConfig);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '4px 4px 0 0'
        }}
      >
        <Typography variant="h6" component="h2">
          {formConfig.title || 'Untitled Form'}
        </Typography>
        <Box>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mr: 2, 
                display: 'inline-flex',
                py: 0
              }}
            >
              {error}
            </Alert>
          )}
          {onPreview && (
            <Button
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={onPreview}
              sx={{ mr: 1 }}
            >
              Preview
            </Button>
          )}
          {onSave && (
            <Button
              variant="contained"
              onClick={onSave}
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={20} /> : null}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </Box>
      </Paper>
      
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.default'
      }}>
        {/* Main content */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          flexGrow: 1,
          overflow: 'auto',
          p: 2
        }}>
          {/* Tab navigation */}
          <Box sx={{ mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              aria-label="form builder tabs"
            >
              <Tab 
                value="builder" 
                label="Form Builder" 
              />
              <Tab 
                value="settings" 
                label="Form Settings" 
                icon={<SettingsIcon />} 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Builder tab content */}
          {activeTab === 'builder' && (
            <FormBuilderContent
              formConfig={formConfig}
              activeSectionIndex={activeSectionIndex}
              onSectionChange={handleSectionChange}
              onAddSection={handleAddSection}
              onUpdateSection={handleUpdateSection}
              onDeleteSection={handleDeleteSection}
              onAddField={handleAddField}
              onUpdateField={handleUpdateField}
              onDeleteField={handleDeleteField}
              onChange={onChange}
            />
          )}

          {/* Settings tab content */}
          {activeTab === 'settings' && (
            <Box sx={{ 
              flexGrow: 1,
              overflow: 'auto',
              p: 2
            }}>
              <FormBuilderSettings
                formConfig={formConfig}
                onUpdateFormConfig={handleUpdateSettings}
                onClose={() => setActiveTab('builder')}
                form={form}
                onUpdateForm={onUpdateForm}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
