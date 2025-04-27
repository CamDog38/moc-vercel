import { Condition, FormField } from './types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ConditionItemProps {
  condition: Condition;
  index: number;
  formFields: FormField[];
  formId: string;
  onRemove: (id: string) => void;
  onChange: (id: string, field: string, value: string) => void;
  canRemove: boolean;
}

export function ConditionItem({
  condition,
  index,
  formFields,
  formId,
  onRemove,
  onChange,
  canRemove
}: ConditionItemProps) {
  // Find the selected field to get its label for display
  const selectedField = formFields.find(f => (f.key || f.id) === condition.field);

  return (
    <div className="space-y-4 p-4 border rounded-md">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Condition {index + 1}</h4>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(condition.id)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor={`field-${condition.id}`}>Field</Label>
        {formId ? (
          <Select
            value={condition.field}
            onValueChange={(value) => onChange(condition.id, 'field', value)}
          >
            <SelectTrigger id={`field-${condition.id}`}>
              <SelectValue placeholder="Select a field" />
            </SelectTrigger>
            <SelectContent>
              {formFields.map(field => (
                <SelectItem key={field.id} value={field.stableId || field.key || field.id}>
                  {field.label} {field.stableId ? `(${field.stableId})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={`field-${condition.id}`}
            value={condition.field}
            onChange={(e) => onChange(condition.id, 'field', e.target.value)}
            placeholder="Please select a form first"
            disabled={!formId}
          />
        )}
        {!formId && (
          <p className="text-xs text-amber-600 mt-1">
            Please select a form to see available fields
          </p>
        )}
        {selectedField && (
          <p className="text-xs text-muted-foreground mt-1">
            Field type: {selectedField.type}
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor={`operator-${condition.id}`}>Operator</Label>
        <Select
          value={condition.operator}
          onValueChange={(value) => onChange(condition.id, 'operator', value)}
        >
          <SelectTrigger id={`operator-${condition.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">Equals</SelectItem>
            <SelectItem value="notEquals">Not Equals</SelectItem>
            <SelectItem value="contains">Contains</SelectItem>
            <SelectItem value="notContains">Not Contains</SelectItem>
            <SelectItem value="startsWith">Starts With</SelectItem>
            <SelectItem value="endsWith">Ends With</SelectItem>
            <SelectItem value="greaterThan">Greater Than</SelectItem>
            <SelectItem value="lessThan">Less Than</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor={`value-${condition.id}`}>Value</Label>
        {condition.fieldType === 'select' && condition.fieldOptions && condition.fieldOptions.length > 0 ? (
          <Select
            value={condition.value}
            onValueChange={(value) => onChange(condition.id, 'value', value)}
          >
            <SelectTrigger id={`value-${condition.id}`}>
              <SelectValue placeholder="Select a value" />
            </SelectTrigger>
            <SelectContent>
              {condition.fieldOptions.map((option, i) => {
                console.log(`Rendering option ${i} for condition ${condition.id}:`, option);
                
                // First check if the condition itself has originalOptions (from our previous update)
                if (condition.originalOptions && condition.originalOptions.length > 0) {
                  console.log('Condition has original options:', condition.originalOptions);
                  
                  const originalOption = condition.originalOptions[i];
                  if (originalOption) {
                    const displayLabel = typeof originalOption === 'object' ? 
                      (originalOption.label || originalOption.value || option) : option;
                    const optionValue = typeof originalOption === 'object' ? 
                      (originalOption.value || option) : option;
                      
                    console.log('Using option from condition originalOptions:', {
                      displayLabel,
                      optionValue,
                      originalOption
                    });
                    
                    return (
                      <SelectItem key={`${condition.id}-option-${i}`} value={optionValue}>
                        {displayLabel}
                      </SelectItem>
                    );
                  }
                }
                
                // Fallback to looking up in formFields if condition doesn't have originalOptions
                const selectedField = formFields.find(f => (f.key || f.id) === condition.field);
                console.log('Selected field for options:', selectedField);
                
                let displayLabel = option;
                let optionValue = option;
                
                // Try to find the original option object from the form field to get the label
                if (selectedField && selectedField.originalOptions) {
                  console.log('Field has original options:', selectedField.originalOptions);
                  
                  const originalOption = selectedField.originalOptions.find(
                    (opt: any) => {
                      const match = opt.value === option || opt.label === option;
                      console.log(`Checking option match:`, {
                        originalOption: opt,
                        currentOption: option,
                        match: match
                      });
                      return match;
                    }
                  );
                  
                  if (originalOption) {
                    console.log('Found matching original option:', originalOption);
                    displayLabel = originalOption.label || option;
                    optionValue = originalOption.value || option;
                    console.log('Using display label:', displayLabel, 'and value:', optionValue);
                  } else {
                    console.log('No matching original option found, using option as is:', option);
                  }
                } else {
                  console.log('No original options available for field, using option as is:', option);
                }
                
                return (
                  <SelectItem key={`${condition.id}-option-${i}`} value={optionValue}>
                    {displayLabel}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={`value-${condition.id}`}
            value={condition.value}
            onChange={(e) => onChange(condition.id, 'value', e.target.value)}
            placeholder={condition.field ? "Enter value" : "Select a field first"}
            disabled={!condition.field}
          />
        )}
      </div>
    </div>
  );
}
