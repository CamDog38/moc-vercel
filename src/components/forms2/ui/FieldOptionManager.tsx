/**
 * Field Option Manager Component
 * 
 * A reusable component for managing field options (for select, radio, checkbox fields)
 */

import { Box, TextField, IconButton, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { FieldOption } from '@/lib/forms2/core/types';
import { generateId } from '@/lib/forms2/utils/idUtils';

interface FieldOptionManagerProps {
  options: FieldOption[];
  onChange: (updatedOptions: FieldOption[]) => void;
  allowEmpty?: boolean;
}

export default function FieldOptionManager({
  options,
  onChange,
  allowEmpty = false
}: FieldOptionManagerProps) {
  // Add a new option
  const handleAddOption = () => {
    const newOption: FieldOption = {
      id: generateId('option'),
      label: `Option ${options.length + 1}`,
      value: `option${options.length + 1}`
    };
    
    onChange([...options, newOption]);
  };
  
  // Add multiple options at once
  const handleAddMultipleOptions = () => {
    const currentCount = options.length;
    const newOptions = [];
    
    // Add 3 new options
    for (let i = 1; i <= 3; i++) {
      newOptions.push({
        id: generateId('option'),
        label: `Option ${currentCount + i}`,
        value: `option${currentCount + i}`
      });
    }
    
    onChange([...options, ...newOptions]);
  };

  // Update an option
  const handleUpdateOption = (optionIndex: number, fieldName: 'label' | 'value', value: string) => {
    const updatedOptions = [...options];
    updatedOptions[optionIndex] = {
      ...updatedOptions[optionIndex],
      [fieldName]: value
    };
    
    onChange(updatedOptions);
  };

  // Delete an option
  const handleDeleteOption = (optionIndex: number) => {
    if (!allowEmpty && options.length <= 1) {
      return;
    }
    
    const updatedOptions = options.filter((_, index) => index !== optionIndex);
    onChange(updatedOptions);
  };

  return (
    <Box sx={{ mb: 2 }}>
      {options.map((option, optionIndex) => (
        <Box 
          key={option.id} 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 1 
          }}
        >
          <TextField
            label="Label"
            value={option.label}
            onChange={(e) => handleUpdateOption(optionIndex, 'label', e.target.value)}
            size="small"
            sx={{ mr: 1, flex: 1 }}
          />
          <TextField
            label="Value"
            value={option.value}
            onChange={(e) => handleUpdateOption(optionIndex, 'value', e.target.value)}
            size="small"
            sx={{ mr: 1, flex: 1 }}
          />
          <IconButton 
            size="small" 
            onClick={() => handleDeleteOption(optionIndex)}
            disabled={!allowEmpty && options.length <= 1}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ))}
      
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddOption}
          variant="contained"
          color="primary"
        >
          + Add Option
        </Button>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddMultipleOptions}
          variant="outlined"
          color="primary"
        >
          + Add Multiple Options
        </Button>
      </Box>
    </Box>
  );
}
