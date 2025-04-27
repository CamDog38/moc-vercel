/**
 * Form Builder Component
 * 
 * A reusable component for building forms in the Form System 2.0.
 * This component is used by both the create and edit pages to ensure consistency.
 * Includes drag and drop functionality for reordering sections and fields.
 * 
 * Features:
 * - Intuitive drag and drop interface
 * - Automatic field name generation
 * - Section-based organization
 * - Live preview
 * - Keyboard accessibility for all interactions
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import FormSectionComponent from './FormSection';
import { FieldConfig, FormSection, FormConfig, TextFieldConfig, FieldType, DateFieldConfig } from '@/lib/forms2/core/types';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { generateId } from '@/lib/forms2/utils/idUtils';
import { Eye, Save } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateFieldName, updateFieldNamesForSection, shouldAutoUpdateFieldName } from './helpers/fieldNameHelper';
import { generateStableId, addStableIdToField, addStableIdsToFields } from '@/lib/forms2/utils/stableIdGenerator';

interface FormBuilderProps {
  formConfig: FormConfig;
  onChange: (formConfig: FormConfig) => void;
  onSave: () => void;
  onPreview?: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  form?: any; // Form model data
  onUpdateForm?: (updates: any) => void; // Function to update form model
}

export default function FormBuilder({ 
  formConfig: initialFormConfig, 
  onChange, 
  onSave, 
  onPreview, 
  isSaving = false, 
  hasUnsavedChanges = false,
  form,
  onUpdateForm
}: FormBuilderProps) {
  const [sections, setSections] = useState<FormSection[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  // For React 18 StrictMode double-rendering fix
  useEffect(() => {
    if (!isInitialized && initialFormConfig) {
      // Ensure all sections and fields have IDs and stable IDs
      const sectionsWithIds = initialFormConfig.sections.map(section => {
        // Process fields to ensure they have IDs and stable IDs
        const fieldsWithIds = section.fields.map((field: FieldConfig) => {
          // Ensure field has an ID
          const fieldWithId = {
            ...field,
            id: field.id || generateId()
          };
          
          // Add stable ID if it doesn't exist
          if (!fieldWithId.stableId) {
            return addStableIdToField(fieldWithId, section.title);
          }
          
          return fieldWithId;
        });
        
        // Return section with processed fields
        return {
          ...section,
          id: section.id || generateId(),
          fields: fieldsWithIds
        };
      });
      
      setSections(sectionsWithIds);
      setIsInitialized(true);
      
      // Log the sections with stable IDs for debugging
      console.log('Initialized sections with stable IDs:', sectionsWithIds);
    }
  }, [initialFormConfig, isInitialized]);

  // Handle drag and drop reordering
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    
    // If dropped outside a valid droppable area
    if (!destination) return;
    
    // If dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;
    
    // Create a deep copy to avoid mutation issues
    const updatedSections = JSON.parse(JSON.stringify(sections)) as FormSection[];
    
    // Handle section reordering
    if (type === 'section') {
      const [movedSection] = updatedSections.splice(source.index, 1);
      updatedSections.splice(destination.index, 0, movedSection);
      
      // Update order property on each section
      updatedSections.forEach((section, index) => {
        section.order = index;
      });
      
      setSections(updatedSections);
      updateFormConfig(updatedSections);
      return;
    }
    
    // Handle field reordering
    if (type === 'field') {
      const sourceSectionIndex = updatedSections.findIndex(s => s.id === source.droppableId);
      const destSectionIndex = updatedSections.findIndex(s => s.id === destination.droppableId);
      
      if (sourceSectionIndex === -1 || destSectionIndex === -1) return;
      
      // If moving within the same section
      if (source.droppableId === destination.droppableId) {
        const section = updatedSections[sourceSectionIndex];
        // Create a copy of the field to ensure type safety
        const movedField = JSON.parse(JSON.stringify(section.fields[source.index]));
        section.fields.splice(source.index, 1);
        section.fields.splice(destination.index, 0, movedField);
      } else {
        // Moving between different sections
        const sourceSection = updatedSections[sourceSectionIndex];
        const destSection = updatedSections[destSectionIndex];
        
        // Create a copy of the field to ensure type safety
        const movedField = JSON.parse(JSON.stringify(sourceSection.fields[source.index]));
        sourceSection.fields.splice(source.index, 1);
        destSection.fields.splice(destination.index, 0, movedField);
      }
      
      setSections(updatedSections);
      updateFormConfig(updatedSections);
    }
  };

  // Add a new section
  const handleAddSection = () => {
    const newSection: FormSection = {
      id: generateId(),
      title: `Section ${sections.length + 1}`,
      fields: [] as FieldConfig[],
      order: sections.length
    };
    
    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    updateFormConfig(updatedSections);
  };

  // Update a section
  const handleSectionUpdate = (sectionId: string, updates: Partial<FormSection>) => {
    const updatedSections = [...sections];
    const sectionIndex = updatedSections.findIndex(section => section.id === sectionId);
    
    if (sectionIndex !== -1) {
      // Update the section with the new values
      updatedSections[sectionIndex] = {
        ...updatedSections[sectionIndex],
        ...updates
      };
      
      // If the section title has changed, update all field names in this section
      if (updates.title && updates.title !== updatedSections[sectionIndex].title) {
        console.log(`Section title changed from "${updatedSections[sectionIndex].title}" to "${updates.title}". Updating field names...`);
        
        // Update field names based on the new section title
        updatedSections[sectionIndex].fields = updateFieldNamesForSection(
          updatedSections[sectionIndex].fields,
          updates.title
        );
      }
      
      setSections(updatedSections);
      updateFormConfig(updatedSections);
    }
  };

  // Remove a section
  const handleSectionDelete = (sectionId: string) => {
    // Create a deep copy to avoid mutation issues
    const updatedSections = JSON.parse(JSON.stringify(sections)) as FormSection[];
    
    // Find the index of the section to be deleted
    const sectionIndex = updatedSections.findIndex(section => section.id === sectionId);
    if (sectionIndex === -1) return;
    
    // Filter out the section to be deleted
    const filteredSections = updatedSections.filter(section => section.id !== sectionId);
    
    // Update order property on each section
    filteredSections.forEach((section, index) => {
      section.order = index;
    });
    
    // Update sections state
    setSections(filteredSections);
    
    // Adjust the active section index if needed
    if (filteredSections.length === 0) {
      // If no sections left, add a new empty section
      const newSection: FormSection = {
        id: generateId(),
        title: 'Section 1',
        fields: [] as FieldConfig[],
        order: 0
      };
      
      setSections([newSection]);
      setActiveSection(0);
      updateFormConfig([newSection]);
    } else {
      // If the deleted section was the active one or came before it
      if (sectionIndex <= activeSection) {
        // If it was the last section, set active to the new last section
        if (activeSection >= filteredSections.length) {
          setActiveSection(filteredSections.length - 1);
        } else if (sectionIndex === activeSection) {
          // If it was the active section, keep the same index (which now points to the next section)
          // unless it was the last section
          if (activeSection === updatedSections.length - 1) {
            setActiveSection(Math.max(0, activeSection - 1));
          }
        }
        // Otherwise, active section index stays the same
      }
      
      updateFormConfig(filteredSections);
    }
  };

  // Add a new field to a section
  const handleAddField = (sectionId: string, fieldType: FieldType = 'text') => {
    const updatedSections = [...sections];
    const sectionIndex = updatedSections.findIndex(section => section.id === sectionId);
    
    if (sectionIndex !== -1) {
      // Create a new field ID
      const fieldId = generateId();
      
      // Create a default field label
      const fieldLabel = `New ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Field`;
      
      // Generate field name based on section title and field label
      const sectionTitle = updatedSections[sectionIndex].title;
      const fieldName = generateFieldName(fieldLabel, sectionTitle, fieldId);
      
      // Generate a stable ID for the field
      const stableId = generateStableId({ 
        id: fieldId, 
        type: fieldType, 
        label: fieldLabel, 
        name: fieldName 
      } as any, sectionTitle);
      
      // Create a base field config with required properties
      const baseField = {
        id: fieldId,
        type: fieldType,
        label: fieldLabel,
        name: fieldName,
        placeholder: '',
        required: false,
        stableId: stableId, // Add stable ID for reliable field matching
        mapping: {
          type: 'custom' as const,
          value: fieldName,
          customKey: fieldName
        }
      };
      
      // Add type-specific properties
      let newField: FieldConfig;
      
      if (['date', 'time', 'datetime', 'datetime-local', 'dob'].includes(fieldType)) {
        // Date field specific properties
        const dateField: DateFieldConfig = {
          ...baseField,
          type: fieldType as 'date' | 'time' | 'datetime' | 'datetime-local' | 'dob',
          // Ensure all required properties from DateFieldConfig are present
          min: undefined,
          max: undefined
        };
        
        // Add specific properties for datetime-local
        if (fieldType === 'datetime-local') {
          dateField.includeTime = true;
          dateField.allowTimeToggle = true;
        }
        
        newField = dateField;
      } else if (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') {
        // Options field specific properties
        newField = {
          ...baseField,
          type: fieldType,
          options: [
            { id: `option_${Date.now()}_1`, label: 'Option 1', value: 'option1' },
            { id: `option_${Date.now()}_2`, label: 'Option 2', value: 'option2' },
            { id: `option_${Date.now()}_3`, label: 'Option 3', value: 'option3' }
          ]
        } as FieldConfig;
      } else {
        // Default field properties
        newField = {
          ...baseField,
          type: fieldType
        } as FieldConfig;
      }
      
      // Add the new field to the section
      updatedSections[sectionIndex].fields.push(newField);
      
      setSections(updatedSections);
      updateFormConfig(updatedSections);
    }
  };

  // Update a field
  const handleFieldUpdate = (sectionId: string, fieldId: string, updates: Partial<FieldConfig>) => {
    console.group(`🔄 FormBuilder: handleFieldUpdate for field ${fieldId} in section ${sectionId}`);
    console.log('Updates received:', updates);
    
    // Log options updates specifically
    if ('options' in updates) {
      console.log('OPTIONS UPDATE DETECTED:', {
        newOptions: updates.options,
        optionsCount: (updates as any).options?.length
      });
    }
    
    // Log conditional logic updates specifically
    if (updates.conditionalLogic !== undefined) {
      console.log('CONDITIONAL LOGIC UPDATE DETECTED:', {
        newConditionalLogic: updates.conditionalLogic,
        action: updates.conditionalLogic?.action,
        field: updates.conditionalLogic?.when?.field,
        operator: updates.conditionalLogic?.when?.operator,
        value: updates.conditionalLogic?.when?.value
      });
    }
    
    // Create a deep copy to avoid mutation issues
    const updatedSections = JSON.parse(JSON.stringify(sections)) as FormSection[];
    
    const sectionIndex = updatedSections.findIndex(section => section.id === sectionId);
    if (sectionIndex === -1) {
      console.error('Section not found:', sectionId);
      console.groupEnd();
      return;
    }
    
    const fieldIndex = updatedSections[sectionIndex].fields.findIndex(field => field.id === fieldId);
    if (fieldIndex === -1) {
      console.error('Field not found:', fieldId);
      console.groupEnd();
      return;
    }
    
    // Get the current field
    const currentField = updatedSections[sectionIndex].fields[fieldIndex];
    console.log('Current field before update:', {
      id: currentField.id,
      type: currentField.type,
      label: currentField.label,
      conditionalLogic: currentField.conditionalLogic
    });
    
    // Check if we're changing the field type
    if (updates.type && updates.type !== currentField.type) {
      // Create a new field with the new type but preserve the id, label, and name
      // Create a new field with the new type but preserve existing properties
      // Start with a copy of the current field
      const newField = { ...currentField };
      
      // Update the type
      newField.type = updates.type;
      
      // Preserve conditional logic if it exists
      if (currentField.conditionalLogic) {
        newField.conditionalLogic = { ...currentField.conditionalLogic };
      }
      
      // Add type-specific properties based on field type
      if (['date', 'time', 'datetime', 'datetime-local', 'dob'].includes(updates.type)) {
        // Create a properly typed DateFieldConfig
        const dateField = newField as DateFieldConfig;
        
        // Add specific properties for datetime-local
        if (updates.type === 'datetime-local') {
          console.log('Setting datetime-local properties');
          dateField.includeTime = true;
          dateField.allowTimeToggle = true;
        } else if (updates.type === 'dob') {
          // DOB specific properties if needed
          dateField.min = undefined; // Don't allow future dates for DOB
        }
      }
      
      // Log the new field for debugging
      console.log('New field after type change:', newField);
      
      // Replace the field with the new one
      // Use type assertion to ensure TypeScript is happy with the type change
      updatedSections[sectionIndex].fields[fieldIndex] = newField as FieldConfig;
    } else {
      // Ensure we preserve the conditionalLogic if it exists
      if (updates.conditionalLogic) {
        console.log('Preserving conditional logic in field update');
        // Make sure we're not losing any properties from the conditional logic
        const updatedField = {
          ...currentField,
          ...updates,
          conditionalLogic: {
            ...updates.conditionalLogic
          }
        };
        // Use type assertion to ensure TypeScript is happy
        updatedSections[sectionIndex].fields[fieldIndex] = updatedField as typeof currentField;
      } else {
        // Regular update without conditional logic changes
        const updatedField = {
          ...currentField,
          ...updates
        };
        
        // Special handling for options updates to ensure they're properly tracked
        if ('options' in updates) {
          console.log('Applying options update to field', fieldId);
          (updatedField as any).options = (updates as any).options;
        }
        
        // If the label has changed, always update the field name
        if (updates.label) {
          const sectionTitle = updatedSections[sectionIndex].title;
          const newFieldName = generateFieldName(updates.label, sectionTitle, fieldId);
          
          // Check if we should auto-update the field name
          // Force update if the field name is empty or matches our auto-generated pattern
          const shouldUpdate = shouldAutoUpdateFieldName(currentField, true);
          
          if (shouldUpdate) {
            console.log(`Field label changed to "${updates.label}". Auto-updating field name to "${newFieldName}".`);
            
            // Update the field name and mapping
            updatedField.name = newFieldName;
            updatedField.mapping = {
              type: 'custom',
              value: newFieldName,
              customKey: newFieldName
            };
            
            // Only update the stable ID if it doesn't already exist or was auto-generated
            if (!updatedField.stableId || updatedField.stableId.startsWith('field_')) {
              // Generate a new stable ID based on the updated field properties
              updatedField.stableId = generateStableId({
                ...updatedField,
                label: updates.label
              } as any, sectionTitle);
              
              console.log(`Generated new stable ID: ${updatedField.stableId} for field with label "${updates.label}"`);
            } else {
              console.log(`Preserved existing stable ID: ${updatedField.stableId} for field with label "${updates.label}"`);
            }
          } else {
            console.log(`Field label changed to "${updates.label}" but not updating field name because it appears to be custom.`);
          }
        }
        
        // Use type assertion to ensure TypeScript is happy
        updatedSections[sectionIndex].fields[fieldIndex] = updatedField as typeof currentField;
      }
      
      const updatedField = updatedSections[sectionIndex].fields[fieldIndex];
      console.log('Updated field:', {
        id: updatedField.id,
        type: updatedField.type,
        label: updatedField.label,
        options: 'options' in updatedField ? (updatedField as any).options : undefined,
        conditionalLogic: updatedField.conditionalLogic
      });
    }
    
    // Log the updated section
    console.log('Updated section:', {
      id: updatedSections[sectionIndex].id,
      title: updatedSections[sectionIndex].title,
      fieldCount: updatedSections[sectionIndex].fields.length
    });
    
    setSections(updatedSections);
    updateFormConfig(updatedSections);
    console.groupEnd();
  };

  // Remove a field
  const handleFieldDelete = (sectionId: string, fieldId: string) => {
    // Create a deep copy to avoid mutation issues
    const updatedSections = JSON.parse(JSON.stringify(sections)) as FormSection[];
    
    const sectionIndex = updatedSections.findIndex(section => section.id === sectionId);
    if (sectionIndex === -1) return;
    
    // Filter out the field to be deleted
    updatedSections[sectionIndex].fields = updatedSections[sectionIndex].fields.filter(
      field => field.id !== fieldId
    );
    
    setSections(updatedSections);
    updateFormConfig(updatedSections);
  };

  // Helper function to update the full form config with the current sections
  const updateFormConfig = (updatedSections: FormSection[]) => {
    // Create a deep copy of the original form config
    const updatedFormConfig = {
      ...initialFormConfig,
      sections: updatedSections
    };
    
    console.log('Updating form config with new sections:', {
      sectionCount: updatedSections.length,
      totalFields: updatedSections.reduce((count, section) => count + section.fields.length, 0)
    });
    
    // Force a new object to ensure React detects the change
    onChange(JSON.parse(JSON.stringify(updatedFormConfig)));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Form Builder</h3>
        
        {/* Form Type Indicator */}
        {form && form.type && (
          <div className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {form.type === 'BOOKING' ? 'Booking Form' : 'Inquiry Form'}
          </div>
        )}
        
        <div className="flex gap-2">
          {onPreview && (
            <Button variant="outline" className="gap-1" onClick={onPreview}>
              <Eye className="h-4 w-4 mr-1" /> Preview
            </Button>
          )}
          <Button
            onClick={onSave}
            disabled={isSaving}
            className={`${hasUnsavedChanges ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {isSaving ? (
              <span className="animate-spin h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Section Tabs */}
      {sections.length > 0 && (
        <div className="mb-6">
          <Tabs 
            value={String(activeSection)} 
            onValueChange={(value) => setActiveSection(parseInt(value))}
            className="w-full"
          >
            <TabsList className="w-full grid" style={{ 
              gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` 
            }}>
              {sections.map((section, index) => (
                <TabsTrigger 
                  key={section.id} 
                  value={String(index)}
                  className="text-sm"
                >
                  {section.title || `Section ${index + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections" type="section">
          {(provided) => (
            <div 
              className="space-y-6"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {/* Only show the active section */}
              {sections.length > 0 && (
                <Draggable 
                  key={sections[activeSection].id} 
                  draggableId={sections[activeSection].id} 
                  index={activeSection}
                >
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="border rounded-md p-4 bg-card"
                    >
                      <FormSectionComponent
                        section={sections[activeSection]}
                        onUpdate={(updates) => handleSectionUpdate(sections[activeSection].id, updates)}
                        onDelete={() => handleSectionDelete(sections[activeSection].id)}
                        onAddField={(fieldType) => handleAddField(sections[activeSection].id, fieldType)}
                        onUpdateField={(fieldId, updates) => handleFieldUpdate(sections[activeSection].id, fieldId, updates)}
                        onDeleteField={(fieldId) => handleFieldDelete(sections[activeSection].id, fieldId)}
                        dragHandleProps={provided.dragHandleProps}
                      />
                    </div>
                  )}
                </Draggable>
              )}
              {provided.placeholder}
              
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSection}
                className="w-full"
              >
                Add Section
              </Button>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
