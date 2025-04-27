import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { useDebounce } from '@/hooks/useDebounce';

interface LineItemInputProps {
  value: string | number;
  type: 'text' | 'number';
  onChange: (value: any) => void;
  min?: string;
  step?: string;
}

export function LineItemInput({ value, type, onChange, min, step }: LineItemInputProps) {
  // Local state for immediate updates
  const [localValue, setLocalValue] = useState(value);
  
  // Debounce the value before sending to parent
  const debouncedValue = useDebounce(localValue, 300);
  
  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Send debounced value to parent
  useEffect(() => {
    if (localValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue]);
  
  return (
    <Input
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      min={min}
      step={step}
    />
  );
}
