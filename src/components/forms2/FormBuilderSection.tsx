/**
 * Form Builder Section Component
 * 
 * This component represents a section in the form builder with its fields.
 */

import { useState } from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Box, Paper, Typography, IconButton, TextField,
  Divider, Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddIcon from '@mui/icons-material/Add';
import { FormSection, FieldConfig, FieldType } from '@/lib/forms2/core/types';
import FormBuilderField from './FormBuilderField';
import ExpandableSection from './ui/ExpandableSection';

interface FormBuilderSectionProps {
  section: FormSection;
  sectionIndex: number;
  isActive: boolean;
  onUpdate: (updatedSection: FormSection) => void;
  onDelete: () => void;
  onAddField: (type: FieldType) => void;
  onUpdateField: (fieldIndex: number, updatedField: FieldConfig) => void;
  onDeleteField: (fieldIndex: number) => void;
  onActivate: () => void;
  dragHandleProps: any;
}

export default function FormBuilderSection({
  section,
  sectionIndex,
  isActive,
  onUpdate,
  onDelete,
  onAddField,
  onUpdateField,
  onDeleteField,
  onActivate,
  dragHandleProps
}: FormBuilderSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [showSectionSettings, setShowSectionSettings] = useState(false);

  // Toggle section expansion
  const toggleExpanded = () => {
    setExpanded(!expanded);
    if (!expanded) {
      onActivate();
    }
  };

  // Toggle section settings
  const toggleSectionSettings = () => {
    setShowSectionSettings(!showSectionSettings);
    if (!showSectionSettings) {
      onActivate();
    }
  };

  // Update section title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...section,
      title: e.target.value
    });
  };

  // Update section description
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...section,
      description: e.target.value
    });
  };

  return (
    <Paper 
      sx={{ 
        p: 2, 
        border: isActive ? '2px solid #1976d2' : '1px solid #e0e0e0',
        borderRadius: 1
      }}
      onClick={onActivate}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box {...dragHandleProps} sx={{ cursor: 'grab', mr: 1 }}>
          <DragIndicatorIcon color="action" />
        </Box>
        
        <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          {section.title || `Section ${sectionIndex + 1}`}
        </Typography>
        
        <IconButton size="small" onClick={toggleSectionSettings}>
          {showSectionSettings ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
        
        <IconButton size="small" onClick={toggleExpanded}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
        
        <IconButton size="small" onClick={onDelete} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      {showSectionSettings && (
        <ExpandableSection
          title="Section Settings"
          expanded={true}
          onToggle={() => {}}
          showDivider={true}
        >
          <TextField
            label="Section Title"
            value={section.title}
            onChange={handleTitleChange}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          />
          
          <TextField
            label="Section Description"
            value={section.description || ''}
            onChange={handleDescriptionChange}
            fullWidth
            variant="outlined"
            size="small"
            multiline
            rows={2}
          />
        </ExpandableSection>
      )}

      {expanded && (
        <Box sx={{ mt: 2 }}>
          <Droppable droppableId={`section-${sectionIndex}`} type="field">
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{ minHeight: section.fields.length ? 'auto' : 100 }}
              >
                {section.fields.length === 0 ? (
                  <Box 
                    sx={{ 
                      p: 2, 
                      textAlign: 'center', 
                      bgcolor: '#f5f5f5',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      No fields in this section
                    </Typography>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<AddIcon />}
                      onClick={() => onAddField('text' as FieldType)}
                    >
                      Add Field
                    </Button>
                  </Box>
                ) : (
                  section.fields.map((field, fieldIndex) => (
                    <Draggable
                      key={field.id}
                      draggableId={field.id}
                      index={fieldIndex}
                    >
                      {(provided) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          sx={{ mb: 2 }}
                        >
                          <FormBuilderField
                            field={field}
                            fieldIndex={fieldIndex}
                            onUpdate={(updatedField) => onUpdateField(fieldIndex, updatedField)}
                            onDelete={() => onDeleteField(fieldIndex)}
                            dragHandleProps={provided.dragHandleProps}
                          />
                        </Box>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </Box>
      )}
    </Paper>
  );
}
