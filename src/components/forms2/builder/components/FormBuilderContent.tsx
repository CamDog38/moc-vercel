/**
 * Form Builder Content Component
 * 
 * This component renders the main content area of the form builder,
 * including the section tabs and the active section's fields.
 */

import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { FormConfig, FieldType } from '@/lib/forms2/core/types';
import FormBuilderSection from '../../FormBuilderSection';
import FormBuilderTabs from '../../FormBuilderTabs';
import { handleDragEnd } from '../handlers/dragDropHandlers';

interface FormBuilderContentProps {
  formConfig: FormConfig;
  activeSectionIndex: number;
  onSectionChange: (index: number) => void;
  onAddSection: () => void;
  onUpdateSection: (sectionIndex: number, updatedSection: any) => void;
  onDeleteSection: (sectionIndex: number) => void;
  onAddField: (type: FieldType, sectionIndex: number) => void;
  onUpdateField: (sectionIndex: number, fieldIndex: number, updatedField: any) => void;
  onDeleteField: (sectionIndex: number, fieldIndex: number) => void;
  onChange: (formConfig: FormConfig) => void;
}

export const FormBuilderContent: React.FC<FormBuilderContentProps> = ({
  formConfig,
  activeSectionIndex,
  onSectionChange,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onAddField,
  onUpdateField,
  onDeleteField,
  onChange
}) => {
  const handleDragEndWrapper = (result: any) => {
    const updatedConfig = handleDragEnd(
      result,
      formConfig,
      activeSectionIndex,
      onSectionChange
    );
    
    if (updatedConfig) {
      onChange(updatedConfig);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Section Tabs - Always show tabs regardless of multi-page setting */}
      {formConfig.sections.length > 0 && (
        <Box sx={{ mb: 2, mt: 1 }}>
          <FormBuilderTabs
            sections={formConfig.sections}
            activeSection={activeSectionIndex}
            onSectionChange={onSectionChange}
          />
        </Box>
      )}
      
      {/* Section Content - Only show the active section */}
      {formConfig.sections.length > 0 ? (
        <DragDropContext onDragEnd={handleDragEndWrapper}>
          <Droppable droppableId="sections" type="section">
            {(provided: any) => (
              <Box
                {...provided.droppableProps}
                ref={provided.innerRef}
                sx={{ width: '100%' }}
              >
                {/* Only render the active section */}
                <Draggable
                  key={formConfig.sections[activeSectionIndex].id}
                  draggableId={formConfig.sections[activeSectionIndex].id}
                  index={activeSectionIndex}
                >
                  {(provided: any) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{
                        mb: 2,
                      }}
                    >
                      <FormBuilderSection
                        section={formConfig.sections[activeSectionIndex]}
                        sectionIndex={activeSectionIndex}
                        isActive={true}
                        onUpdate={(updatedSection) => onUpdateSection(activeSectionIndex, updatedSection)}
                        onDelete={() => onDeleteSection(activeSectionIndex)}
                        onAddField={(type) => onAddField(type, activeSectionIndex)}
                        onUpdateField={(fieldIndex, updatedField) => 
                          onUpdateField(activeSectionIndex, fieldIndex, updatedField)}
                        onDeleteField={(fieldIndex) => onDeleteField(activeSectionIndex, fieldIndex)}
                        onActivate={() => {}}
                        dragHandleProps={provided.dragHandleProps}
                      />
                    </Box>
                  )}
                </Draggable>
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            No sections yet
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddSection}
          >
            Add Your First Section
          </Button>
        </Box>
      )}

      {/* Add Section Button */}
      {formConfig.sections.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAddSection}
          >
            Add Section
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default FormBuilderContent;
