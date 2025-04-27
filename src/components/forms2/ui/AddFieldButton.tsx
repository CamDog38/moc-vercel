/**
 * Add Field Button Component
 * 
 * A reusable component for adding fields to a form section
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Type, Mail, Phone, AlignLeft, List, CheckSquare, CircleDot, Calendar } from 'lucide-react';
import { FieldType } from '@/lib/forms2/core/types';
import { cn } from '@/lib/utils';

interface AddFieldButtonProps {
  onAddField: (type: FieldType) => void;
  disabled?: boolean;
}

export default function AddFieldButton({ onAddField, disabled = false }: AddFieldButtonProps) {
  const [open, setOpen] = useState(false);

  const handleAddField = (type: FieldType) => {
    console.log('AddFieldButton: Selected field type:', type);
    onAddField(type);
    setOpen(false);
  };

  const fieldTypes = [
    { type: 'text' as FieldType, label: 'Text', icon: <Type className="h-4 w-4" /> },
    { type: 'textarea' as FieldType, label: 'Text Area', icon: <AlignLeft className="h-4 w-4" /> },
    { type: 'email' as FieldType, label: 'Email', icon: <Mail className="h-4 w-4" /> },
    { type: 'tel' as FieldType, label: 'Phone', icon: <Phone className="h-4 w-4" /> },
    { type: 'select' as FieldType, label: 'Dropdown', icon: <List className="h-4 w-4" /> },
    { type: 'checkbox' as FieldType, label: 'Checkbox', icon: <CheckSquare className="h-4 w-4" /> },
    { type: 'radio' as FieldType, label: 'Radio', icon: <CircleDot className="h-4 w-4" /> },
    { type: 'date' as FieldType, label: 'Date', icon: <Calendar className="h-4 w-4" /> },
    { type: 'dob' as FieldType, label: 'Date of Birth', icon: <Calendar className="h-4 w-4" /> },
    { type: 'datetime-local' as FieldType, label: 'Date & Time (with toggle)', icon: <Calendar className="h-4 w-4" /> },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Select Field Type</h4>
          <div className="grid grid-cols-2 gap-2">
            {fieldTypes.map((field) => (
              <Button
                key={field.type.toString()}
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto py-2"
                onClick={() => handleAddField(field.type)}
              >
                <div className="flex items-center gap-2">
                  {field.icon}
                  <span>{field.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
