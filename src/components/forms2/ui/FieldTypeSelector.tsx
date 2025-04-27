/**
 * Field Type Selector Component
 * 
 * A reusable component for selecting field types
 */

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FieldType } from '@/lib/forms2/core/types';

interface FieldTypeSelectorProps {
  value: FieldType;
  onChange: (newType: FieldType) => void;
  id?: string;
  label?: string;
  className?: string;
}

export default function FieldTypeSelector({
  value,
  onChange,
  id = 'field-type',
  label = 'Field Type',
  className
}: FieldTypeSelectorProps) {
  // Get field type display name
  const getFieldTypeDisplay = (type: string): string => {
    switch (type) {
      case 'text': return 'Text';
      case 'textarea': return 'Text Area';
      case 'email': return 'Email';
      case 'tel': return 'Phone';
      case 'number': return 'Number';
      case 'date': return 'Date';
      case 'time': return 'Time';
      case 'datetime': return 'Date & Time';
      case 'datetime-local': return 'Date & Time (with toggle)';
      case 'dob': return 'Date of Birth';
      case 'select': return 'Dropdown';
      case 'multiselect': return 'Multi-select';
      case 'checkbox': return 'Checkbox';
      case 'radio': return 'Radio Buttons';
      case 'file': return 'File Upload';
      case 'hidden': return 'Hidden Field';
      default: return type;
    }
  };

  const handleValueChange = (newValue: string) => {
    onChange(newValue as FieldType);
  };

  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select field type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="text">{getFieldTypeDisplay('text')}</SelectItem>
          <SelectItem value="textarea">{getFieldTypeDisplay('textarea')}</SelectItem>
          <SelectItem value="email">{getFieldTypeDisplay('email')}</SelectItem>
          <SelectItem value="tel">{getFieldTypeDisplay('tel')}</SelectItem>
          <SelectItem value="number">{getFieldTypeDisplay('number')}</SelectItem>
          <SelectItem value="date">{getFieldTypeDisplay('date')}</SelectItem>
          <SelectItem value="time">{getFieldTypeDisplay('time')}</SelectItem>
          <SelectItem value="datetime">{getFieldTypeDisplay('datetime')}</SelectItem>
          <SelectItem value="datetime-local">{getFieldTypeDisplay('datetime-local')}</SelectItem>
          <SelectItem value="dob">{getFieldTypeDisplay('dob')}</SelectItem>
          <SelectItem value="select">{getFieldTypeDisplay('select')}</SelectItem>
          <SelectItem value="multiselect">{getFieldTypeDisplay('multiselect')}</SelectItem>
          <SelectItem value="checkbox">{getFieldTypeDisplay('checkbox')}</SelectItem>
          <SelectItem value="radio">{getFieldTypeDisplay('radio')}</SelectItem>
          <SelectItem value="file">{getFieldTypeDisplay('file')}</SelectItem>
          <SelectItem value="hidden">{getFieldTypeDisplay('hidden')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
