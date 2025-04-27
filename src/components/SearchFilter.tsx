import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface SearchFilterProps {
  onSearchChange: (searchTerm: string) => void;
  placeholder?: string;
  label?: string;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({ 
  onSearchChange, 
  placeholder = "Search by name, email, or phone...",
  label = "Search"
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Debounce search input to avoid excessive filtering
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearchChange(searchTerm);
    }, 300);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, onSearchChange]);

  return (
    <div>
      <Label htmlFor="search" className="text-sm font-medium mb-1 block">{label}</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="search"
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>
    </div>
  );
};

export default SearchFilter;