/**
 * Form Section Component
 * 
 * A reusable component for managing form sections in the form builder.
 * Extracted from the create page to ensure consistency between create and edit pages.
 * 
 * Features:
 * - Drag and drop reordering of sections and fields
 * - Section title and description editing
 * - Field management within sections
 * - Automatic field name generation based on section title
 * - Responsive design for all screen sizes
 * - Keyboard accessibility for all interactions
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { FormSection, FieldConfig, FieldType } from '@/lib/forms2/core/types';
import { generateId } from '@/lib/forms2/utils/idUtils';
// Import the FormField component from the correct path
import FormField from '@/components/forms2/ui/FormField';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import AddFieldButton from './AddFieldButton';

interface FormSectionProps {
  section: FormSection;
  onUpdate: (updatedSection: Partial<FormSection>) => void;
  onDelete: () => void;
  onAddField: (fieldType?: FieldType) => void;
  onUpdateField: (fieldId: string, updates: Partial<FieldConfig>) => void;
  onDeleteField: (fieldId: string) => void;
  dragHandleProps?: any; // For section drag handle
}

export default function FormSectionComponent({
  section,
  onUpdate,
  onDelete,
  onAddField,
  onUpdateField,
  onDeleteField,
  dragHandleProps
}: FormSectionProps) {
  const [showDescription, setShowDescription] = useState(false);

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center flex-1">
            {/* Drag handle for section */}
            <div 
              {...dragHandleProps} 
              className="cursor-grab mr-2 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-5 w-5" />
            </div>
            <Input
              placeholder="Section Title"
              value={section.title || ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="font-medium"
            />
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {showDescription ? (
          <div className="mb-4">
            <Textarea
              placeholder="Section description (optional)"
              value={section.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={3}
              className="mb-2"
            />
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setShowDescription(false)}
              className="p-0 h-auto text-xs"
            >
              Hide description
            </Button>
          </div>
        ) : (
          <Button 
            variant="link" 
            size="sm" 
            onClick={() => setShowDescription(true)}
            className="p-0 h-auto text-xs mb-4"
          >
            Add description
          </Button>
        )}

        <Droppable droppableId={section.id} type="field">
          {(provided) => (
            <div 
              className="space-y-4"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {section.fields.map((field, index) => (
                <Draggable
                  key={field.id}
                  draggableId={field.id}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                    >
                      <FormField
                        key={field.id}
                        field={field}
                        availableFields={section.fields.filter(f => f.id !== field.id)}
                        onUpdate={(updates) => onUpdateField(field.id, updates)}
                        onDelete={() => onDeleteField(field.id)}
                        dragHandleProps={provided.dragHandleProps}
                        sectionTitle={section.title || 'Default'}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
        
        <div className="mt-4">
          <AddFieldButton 
            onAddField={(fieldType) => {
              // Call the parent's onAddField function with the field type
              console.log('FormSection received field type:', fieldType);
              onAddField(fieldType);
            }} 
          />
        </div>
      </CardContent>
    </Card>
  );
}
