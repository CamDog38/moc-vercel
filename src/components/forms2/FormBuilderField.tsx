/**
 * Form Builder Field Component
 * 
 * This component represents a field in the form builder with its settings.
 */

import { useState } from 'react';
import { 
  Box, Paper, Typography, IconButton, TextField,
  FormControlLabel, Switch, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { 
  FieldConfig, FieldType, FieldOption, FieldMapping,
  SelectFieldConfig, RadioFieldConfig, CheckboxFieldConfig 
} from '@/lib/forms2/core/types';
import { generateId } from '@/lib/forms2/utils/idUtils';
import ExpandableSection from './ui/ExpandableSection';
import FieldTypeSelector from './ui/FieldTypeSelector';
import FieldOptionManager from './ui/FieldOptionManager';
import FieldMappingSelector from './FieldMappingSelector';

interface FormBuilderFieldProps {
  field: FieldConfig;
  fieldIndex: number;
  onUpdate: (updatedField: FieldConfig) => void;
  onDelete: () => void;
  dragHandleProps: any;
}

export default function FormBuilderField({
  field,
  fieldIndex,
  onUpdate,
  onDelete,
  dragHandleProps
}: FormBuilderFieldProps) {
  const [expanded, setExpanded] = useState(false);

  // Toggle field expansion
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Update field label
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...field,
      label: e.target.value
    });
  };

  // Update field placeholder
  const handlePlaceholderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...field,
      placeholder: e.target.value
    });
  };

  // Update field help text
  const handleHelpTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...field,
      helpText: e.target.value
    });
  };

  // Toggle required field
  const handleRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...field,
      required: e.target.checked
    });
  };
  
  // Update field mapping
  const handleMappingChange = (mapping: FieldMapping | undefined) => {
    onUpdate({
      ...field,
      mapping
    });
  };

  // Update field type
  const handleTypeChange = (newType: FieldType) => {
    // Create a new field based on the type
    let updatedField: FieldConfig;
    
    // Base properties common to all field types
    const baseProps = {
      id: field.id,
      name: field.name || field.id,
      label: field.label,
      placeholder: field.placeholder,
      helpText: field.helpText,
      required: field.required,
      disabled: field.disabled,
      hidden: field.hidden,
      defaultValue: field.defaultValue,
      validation: field.validation,
      mapping: field.mapping,
      conditionalLogic: field.conditionalLogic,
      stableId: field.stableId,
      inUseByRules: field.inUseByRules,
      metadata: field.metadata
    };
    
    // Handle type-specific properties
    switch (newType) {
      case 'select':
      case 'multiselect':
        updatedField = {
          ...baseProps,
          type: newType,
          options: (field as SelectFieldConfig).options || [
            { id: generateId('option'), label: 'Option 1', value: 'option1' }
          ]
        } as SelectFieldConfig;
        break;
      
      case 'radio':
        updatedField = {
          ...baseProps,
          type: newType,
          options: (field as RadioFieldConfig).options || [
            { id: generateId('option'), label: 'Option 1', value: 'option1' }
          ]
        } as RadioFieldConfig;
        break;
      
      case 'checkbox':
        updatedField = {
          ...baseProps,
          type: newType,
          options: (field as CheckboxFieldConfig).options || [
            { id: generateId('option'), label: 'Option 1', value: 'option1' }
          ]
        } as CheckboxFieldConfig;
        break;
      
      default:
        updatedField = {
          ...baseProps,
          type: newType
        } as FieldConfig;
    }
    
    onUpdate(updatedField);
  };

  // Helper to get options
  const getOptions = () => {
    if (field.type === 'select' || field.type === 'multiselect') {
      return (field as SelectFieldConfig).options || [];
    } else if (field.type === 'radio') {
      return (field as RadioFieldConfig).options || [];
    } else if (field.type === 'checkbox') {
      return (field as CheckboxFieldConfig).options || [];
    }
    return [];
  };

  // Update options
  const handleOptionsChange = (updatedOptions: FieldOption[]) => {
    let updatedField: FieldConfig;
    
    if (field.type === 'select' || field.type === 'multiselect') {
      updatedField = {
        ...field,
        options: updatedOptions
      } as SelectFieldConfig;
    } else if (field.type === 'radio') {
      updatedField = {
        ...field,
        options: updatedOptions
      } as RadioFieldConfig;
    } else if (field.type === 'checkbox') {
      updatedField = {
        ...field,
        options: updatedOptions
      } as CheckboxFieldConfig;
    } else {
      return;
    }
    
    onUpdate(updatedField);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: expanded ? 2 : 0 }}>
        <Box {...dragHandleProps} sx={{ cursor: 'grab', mr: 1 }}>
          <DragIndicatorIcon color="action" />
        </Box>
        
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          {field.label || `Field ${fieldIndex + 1}`}
          <Typography component="span" variant="caption" sx={{ ml: 1, bgcolor: 'primary.light', color: 'white', px: 1, py: 0.5, borderRadius: 1 }}>
            {field.type}
          </Typography>
        </Typography>
        
        <IconButton size="small" onClick={toggleExpanded}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
        
        <IconButton size="small" onClick={onDelete} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
      
      {expanded && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Field Label"
              value={field.label}
              onChange={handleLabelChange}
              fullWidth
              variant="outlined"
              size="small"
            />
            
            <FieldTypeSelector 
              value={field.type} 
              onChange={handleTypeChange} 
              id={`field-${field.id}-type`}
            />
          </Box>
          
          <TextField
            label="Placeholder"
            value={field.placeholder || ''}
            onChange={handlePlaceholderChange}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          />
          
          <TextField
            label="Help Text"
            value={field.helpText || ''}
            onChange={handleHelpTextChange}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={field.required || false}
                onChange={handleRequiredChange}
                color="primary"
              />
            }
            label="Required Field"
            sx={{ mb: 2, display: 'block' }}
          />
          
          <Divider sx={{ my: 2 }} />
          
          {/* Field Mapping */}
          <ExpandableSection
            title="Field Mapping"
            expanded={false}
            onToggle={() => {}}
            showDivider={false}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Map this field to lead/booking data for automatic processing.
            </Typography>
            <FieldMappingSelector
              value={field.mapping}
              onChange={handleMappingChange}
              fieldType={field.type}
              label="Map to"
            />
          </ExpandableSection>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Field-specific settings */}
          {(field.type === 'select' || field.type === 'multiselect' || field.type === 'radio' || field.type === 'checkbox') && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Field Options
              </Typography>
              <Box sx={{ 
                bgcolor: 'background.paper', 
                p: 2, 
                border: '1px solid', 
                borderColor: 'divider',
                borderRadius: 1
              }}>
                <FieldOptionManager
                  options={getOptions()}
                  onChange={handleOptionsChange}
                />
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}
