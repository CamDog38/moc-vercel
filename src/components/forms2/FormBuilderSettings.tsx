/**
 * Form Builder Settings Component
 * 
 * This component provides a UI for editing form-wide settings.
 */

import { useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Switch, FormControlLabel,
  IconButton, InputAdornment, Button, Divider, Select, MenuItem,
  SelectChangeEvent
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import SettingsIcon from '@mui/icons-material/Settings';
import CodeIcon from '@mui/icons-material/Code';
import { FormConfig } from '@/lib/forms2/core/types';

// Define theme interface for type safety
interface FormTheme {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
}
import ExpandableSection from './ui/ExpandableSection';

interface FormBuilderSettingsProps {
  formConfig: FormConfig;
  onUpdateFormConfig: (updatedConfig: FormConfig) => void;
  onClose: () => void;
  form?: any; // The form model containing type information
  onUpdateForm?: (updates: any) => void; // Function to update the form model
}

export default function FormBuilderSettings({
  formConfig,
  onUpdateFormConfig,
  onClose,
  form,
  onUpdateForm
}: FormBuilderSettingsProps) {
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    appearance: false,
    behavior: false,
    advanced: false
  });

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  // Update form title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFormConfig({
      ...formConfig,
      title: e.target.value
    });
  };

  // Update form description
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFormConfig({
      ...formConfig,
      description: e.target.value
    });
  };

  // Update form submit button text
  const handleSubmitButtonTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFormConfig({
      ...formConfig,
      submitButtonText: e.target.value
    });
  };

  // Update form success message
  const handleSuccessMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFormConfig({
      ...formConfig,
      successMessage: e.target.value
    });
  };

  // Toggle multi-page form
  const handleMultiPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Make sure to update both the direct property and the metadata
    onUpdateFormConfig({
      ...formConfig,
      isMultiPage: e.target.checked,
      metadata: {
        ...formConfig.metadata,
        isMultiPage: e.target.checked,
        // Set default step settings when enabling multi-step
        ...(e.target.checked && {
          showStepIndicator: true,
          showStepNumbers: true,
          allowStepNavigation: true,
          nextButtonText: "Next",
          previousButtonText: "Previous"
        })
      }
    });
  };

  // Toggle allow multiple submissions
  const handleAllowMultipleSubmissionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Store in metadata since it's not a direct property of FormConfig
    onUpdateFormConfig({
      ...formConfig,
      metadata: {
        ...formConfig.metadata,
        allowMultipleSubmissions: e.target.checked
      }
    });
  };

  // Update theme settings
  const handleThemeChange = (property: keyof FormTheme, value: string) => {
    // Store theme settings in metadata since it's not a direct property of FormConfig
    const currentTheme = formConfig.metadata?.theme || {};
    const updatedTheme = {
      ...currentTheme,
      [property]: value
    };
    
    onUpdateFormConfig({
      ...formConfig,
      metadata: {
        ...formConfig.metadata,
        theme: updatedTheme
      }
    });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Form Settings
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      
      <Box sx={{ overflow: 'auto', flex: 1, pr: 1 }}>

      {/* Basic Settings */}
      <ExpandableSection
        title="Basic Settings"
        expanded={expandedSections.basic}
        onToggle={() => toggleSection('basic')}
        showDivider={true}
        startIcon={<SettingsIcon fontSize="small" />}
      >
        {/* Form Type Dropdown */}
        {form && onUpdateForm && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Form Type
            </Typography>
            <Select
              value={form.type || 'INQUIRY'}
              onChange={(e: SelectChangeEvent) => {
                onUpdateForm({
                  ...form,
                  type: e.target.value
                });
              }}
              fullWidth
              size="small"
              sx={{ mb: 1 }}
            >
              <MenuItem value="INQUIRY">Inquiry Form</MenuItem>
              <MenuItem value="BOOKING">Booking Form</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary">
              {form.type === 'BOOKING' 
                ? "Booking forms collect date/time information and create calendar events" 
                : "Inquiry forms collect general information and create leads"}
            </Typography>
          </Box>
        )}
        
        <TextField
          label="Form Title"
          value={formConfig.title || ''}
          onChange={handleTitleChange}
          fullWidth
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
        />
        
        <TextField
          label="Form Description"
          value={formConfig.description || ''}
          onChange={handleDescriptionChange}
          fullWidth
          variant="outlined"
          size="small"
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />
        
        <TextField
          label="Submit Button Text"
          value={formConfig.submitButtonText || 'Submit'}
          onChange={handleSubmitButtonTextChange}
          fullWidth
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
        />
        
        <TextField
          label="Success Message"
          value={formConfig.successMessage || 'Thank you for your submission!'}
          onChange={handleSuccessMessageChange}
          fullWidth
          variant="outlined"
          size="small"
          multiline
          rows={2}
        />
      </ExpandableSection>

      {/* Appearance Settings */}
      <ExpandableSection
        title="Appearance"
        expanded={expandedSections.appearance}
        onToggle={() => toggleSection('appearance')}
        showDivider={true}
        startIcon={<ColorLensIcon fontSize="small" />}
      >
        <TextField
          label="Primary Color"
          value={((formConfig.metadata?.theme as FormTheme)?.primaryColor || '#1976d2')}
          onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Box 
                  sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: (formConfig.metadata?.theme as FormTheme)?.primaryColor || '#1976d2',
                    borderRadius: '4px'
                  }} 
                />
              </InputAdornment>
            ),
          }}
        />
        
        <TextField
          label="Background Color"
          value={((formConfig.metadata?.theme as FormTheme)?.backgroundColor || '#ffffff')}
          onChange={(e) => handleThemeChange('backgroundColor', e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Box 
                  sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: (formConfig.metadata?.theme as FormTheme)?.backgroundColor || '#ffffff',
                    borderRadius: '4px',
                    border: '1px solid #e0e0e0'
                  }} 
                />
              </InputAdornment>
            ),
          }}
        />
        
        <TextField
          label="Text Color"
          value={((formConfig.metadata?.theme as FormTheme)?.textColor || '#000000')}
          onChange={(e) => handleThemeChange('textColor', e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Box 
                  sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: (formConfig.metadata?.theme as FormTheme)?.textColor || '#000000',
                    borderRadius: '4px'
                  }} 
                />
              </InputAdornment>
            ),
          }}
        />
      </ExpandableSection>

      {/* Behavior Settings */}
      <ExpandableSection
        title="Behavior"
        expanded={expandedSections.behavior}
        onToggle={() => toggleSection('behavior')}
        showDivider={true}
      >
        {/* Multi-Step Form Toggle - Made more prominent */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 2, 
            bgcolor: formConfig.isMultiPage ? 'primary.light' : 'background.paper',
            border: '1px solid',
            borderColor: formConfig.isMultiPage ? 'primary.main' : 'divider'
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Form Type
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={formConfig.isMultiPage || false}
                onChange={handleMultiPageChange}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" fontWeight={500}>
                  {formConfig.isMultiPage ? "Multi-Step Form" : "Single Page Form"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formConfig.isMultiPage 
                    ? "Each section will be displayed as a separate step" 
                    : "All sections will be displayed on a single page"}
                </Typography>
              </Box>
            }
          />
        </Paper>
        
        {/* Multi-step form specific settings - only shown when isMultiPage is true */}
        {formConfig.isMultiPage && (
          <Box sx={{ ml: 4, mb: 2, p: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Multi-step Form Settings
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={formConfig.metadata?.showStepIndicator !== false}
                  onChange={(e) => {
                    onUpdateFormConfig({
                      ...formConfig,
                      metadata: {
                        ...formConfig.metadata,
                        showStepIndicator: e.target.checked
                      }
                    });
                  }}
                  color="primary"
                  size="small"
                />
              }
              label="Show Step Indicator"
              sx={{ mb: 1, display: 'block' }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={formConfig.metadata?.showStepNumbers !== false}
                  onChange={(e) => {
                    onUpdateFormConfig({
                      ...formConfig,
                      metadata: {
                        ...formConfig.metadata,
                        showStepNumbers: e.target.checked
                      }
                    });
                  }}
                  color="primary"
                  size="small"
                />
              }
              label="Show Step Numbers"
              sx={{ mb: 1, display: 'block' }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={formConfig.metadata?.allowStepNavigation || false}
                  onChange={(e) => {
                    onUpdateFormConfig({
                      ...formConfig,
                      metadata: {
                        ...formConfig.metadata,
                        allowStepNavigation: e.target.checked
                      }
                    });
                  }}
                  color="primary"
                  size="small"
                />
              }
              label="Allow Step Navigation"
              sx={{ mb: 1, display: 'block' }}
            />
            
            <TextField
              label="Next Button Text"
              value={formConfig.metadata?.nextButtonText || "Next"}
              onChange={(e) => {
                onUpdateFormConfig({
                  ...formConfig,
                  metadata: {
                    ...formConfig.metadata,
                    nextButtonText: e.target.value
                  }
                });
              }}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ mb: 2 }}
            />
            
            <TextField
              label="Previous Button Text"
              value={formConfig.metadata?.previousButtonText || "Previous"}
              onChange={(e) => {
                onUpdateFormConfig({
                  ...formConfig,
                  metadata: {
                    ...formConfig.metadata,
                    previousButtonText: e.target.value
                  }
                });
              }}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ mb: 2 }}
            />
          </Box>
        )}
        
        <FormControlLabel
          control={
            <Switch
              checked={formConfig.metadata?.allowMultipleSubmissions || false}
              onChange={handleAllowMultipleSubmissionsChange}
              color="primary"
            />
          }
          label="Allow Multiple Submissions"
          sx={{ mb: 1, display: 'block' }}
        />
      </ExpandableSection>

      {/* Advanced Settings */}
      <ExpandableSection
        title="Advanced"
        expanded={expandedSections.advanced}
        onToggle={() => toggleSection('advanced')}
        showDivider={false}
      >
        <Typography variant="body2" color="text.secondary" paragraph>
          Advanced settings will be available in future updates.
        </Typography>
      </ExpandableSection>
      
      {/* JSON Preview */}
      <ExpandableSection
        title="Form JSON"
        expanded={expandedSections.advanced}
        onToggle={() => toggleSection('advanced')}
        showDivider={false}
        startIcon={<CodeIcon fontSize="small" />}
      >
        <TextField
          multiline
          fullWidth
          rows={10}
          value={JSON.stringify(formConfig, null, 2)}
          InputProps={{
            readOnly: true,
            sx: { fontFamily: 'monospace', fontSize: '0.8rem' }
          }}
          variant="outlined"
          size="small"
        />
      </ExpandableSection>
      </Box>
      
      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth
          onClick={onClose}
        >
          Apply Settings
        </Button>
      </Box>
    </Box>
  );
}
