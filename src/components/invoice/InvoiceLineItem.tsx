import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useDebounce } from '@/hooks/useDebounce';

interface LineItem {
  id?: string;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  amount?: string | number;
}

interface InvoiceLineItemProps {
  item: LineItem;
  index: number;
  onUpdate: (index: number, updates: Partial<LineItem>) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function InvoiceLineItem({ item, index, onUpdate, onSave, onDelete }: InvoiceLineItemProps) {
  // Local state for each field
  const [description, setDescription] = useState(item.description);
  const [quantity, setQuantity] = useState(item.quantity);
  const [unitPrice, setUnitPrice] = useState(item.unitPrice);
  
  // Debounce values
  const debouncedDescription = useDebounce(description, 300);
  const debouncedQuantity = useDebounce(quantity, 300);
  const debouncedUnitPrice = useDebounce(unitPrice, 300);
  
  // Update parent component when debounced values change
  useEffect(() => {
    const updates: Partial<LineItem> = {};
    
    if (debouncedDescription !== item.description) {
      updates.description = debouncedDescription;
    }
    if (debouncedQuantity !== item.quantity) {
      updates.quantity = debouncedQuantity;
    }
    if (debouncedUnitPrice !== item.unitPrice) {
      updates.unitPrice = debouncedUnitPrice;
    }
    
    if (Object.keys(updates).length > 0) {
      onUpdate(index, updates);
    }
  }, [debouncedDescription, debouncedQuantity, debouncedUnitPrice]);
  
  // Update local state when props change
  useEffect(() => {
    setDescription(item.description);
    setQuantity(item.quantity);
    setUnitPrice(item.unitPrice);
  }, [item]);
  
  return (
    <>
      <TableCell>
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={onSave}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={onSave}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          onBlur={onSave}
        />
      </TableCell>
      <TableCell className="text-right">
        ${((Number(quantity) || 0) * (Number(unitPrice) || 0)).toFixed(2)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </Button>
      </TableCell>
    </>
  );
}
