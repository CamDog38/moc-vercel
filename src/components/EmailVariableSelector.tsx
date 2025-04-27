import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface EmailVariable {
  name: string;
  description: string;
}

interface EmailVariableCategory {
  [category: string]: EmailVariable[];
}

interface EmailVariableSelectorProps {
  onInsert: (variable: string) => void;
  formId?: string;
}

export function EmailVariableSelector({ onInsert, formId }: EmailVariableSelectorProps) {
  const [variables, setVariables] = useState<EmailVariableCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Helper function to format category names for display
  const formatCategoryName = (category: string): string => {
    // If it's a section-based category (starts with 'section_')
    if (category.startsWith('section_')) {
      // Remove the 'section_' prefix and replace underscores with spaces
      return category.replace('section_', '').replace(/_/g, ' ')
        // Capitalize each word
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // For standard categories, just capitalize the first letter
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  useEffect(() => {
    const fetchVariables = async () => {
      try {
        // If formId is provided, include it in the request to get form-specific variables
        const url = formId 
          ? `/api/emails/variables?formId=${formId}` 
          : '/api/emails/variables';
          
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch variables');
        }
        const data = await response.json();
        setVariables(data.variables);
      } catch (err) {
        setError('Failed to load variables');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVariables();
  }, [formId]);

  const handleInsert = (variableName: string) => {
    onInsert(`{{${variableName}}}`);
    setOpen(false);
    toast({
      title: "Variable Inserted",
      description: `{{${variableName}}} has been added to your template`,
      duration: 2000,
    });
  };
  
  // Filter variables based on search term
  const filterVariables = (category: string, vars: EmailVariable[]) => {
    if (!searchTerm) return vars;
    
    return vars.filter(variable => 
      variable.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      variable.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (loading) {
    return <Button variant="outline" disabled>Loading variables...</Button>;
  }

  if (error) {
    return <Button variant="outline" disabled>Error: {error}</Button>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">Insert Variable</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <h3 className="font-medium mb-2">Insert Template Variable</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select a variable to insert into your template
        </p>
        
        {/* Search input */}
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search variables..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {variables && (
          <Tabs defaultValue={Object.keys(variables)[0]}>
            <TabsList className="grid grid-cols-3 mb-2">
              {Object.keys(variables).map((category) => (
                <TabsTrigger key={category} value={category}>
                  {formatCategoryName(category)}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.entries(variables).map(([category, vars]) => {
              const filteredVars = filterVariables(category, vars);
              
              return (
                <TabsContent key={category} value={category}>
                  <ScrollArea className="h-60">
                    {filteredVars.length > 0 ? (
                      <div className="space-y-2">
                        {filteredVars.map((variable) => (
                          <div 
                            key={variable.name}
                            className="p-2 hover:bg-muted rounded-md cursor-pointer"
                            onClick={() => handleInsert(variable.name)}
                          >
                            <div className="font-medium">{variable.name}</div>
                            <div className="text-xs text-muted-foreground">{variable.description}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        No variables match your search
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
        
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Variables will be replaced with actual data when the email is sent.</p>
          <p className="mt-1">Example: <code>Hello {'{{clientName}}'}, view your invoice: {'{{invoiceLink}}'}</code></p>
          {formId && (
            <p className="mt-1 text-green-600">Form-specific variables are available in the "Form Fields" tab</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}