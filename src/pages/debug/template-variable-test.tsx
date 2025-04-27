import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, X } from 'lucide-react';

// Sample variable categories and examples
const VARIABLE_CATEGORIES = [
  {
    id: 'basic',
    name: 'Basic Information',
    variables: [
      { id: 'firstName', name: 'First Name', value: 'John' },
      { id: 'lastName', name: 'Last Name', value: 'Smith' },
      { id: 'email', name: 'Email Address', value: 'john.smith@example.com' },
      { id: 'phone', name: 'Phone Number', value: '082-123-4567' },
      { id: 'timeStamp', name: 'Timestamp', value: Date.now().toString() },
    ],
  },
  {
    id: 'weddingDetails',
    name: 'Wedding Details',
    variables: [
      { id: 'weddingDetailsDateTimeOfWedding', name: 'Date & Time of Wedding', value: '2025-06-15 14:00' },
      { id: 'weddingDetailsOfficeAttending', name: 'Office Attending', value: 'Cape Town' },
      { id: 'weddingDetailsVenueName', name: 'Venue Name', value: 'Grand Hotel' },
      { id: 'weddingDetailsVenueContactPerson', name: 'Venue Contact Person', value: 'Jane Smith' },
      { id: 'weddingDetailsVenueContactPhone', name: 'Venue Contact Phone', value: '123-456-7890' },
    ],
  },
  {
    id: 'partner1',
    name: 'Partner 1 Details',
    variables: [
      { id: 'partner1DetailsEmailAddress', name: 'Email Address', value: 'partner1@example.com' },
      { id: 'partner1DetailsIdNumber', name: 'ID Number', value: '1234567890123' },
      { id: 'partner1DetailsPassportNumberCountry', name: 'Passport Number & Country', value: 'N/A' },
      { id: 'partner1DetailsDateOfBirth', name: 'Date of Birth', value: '1990-05-15' },
      { id: 'partner1DetailsFirstName', name: 'First Name', value: 'John' },
      { id: 'partner1DetailsMiddleName', name: 'Middle Name', value: 'Robert' },
      { id: 'partner1DetailsLastName', name: 'Last Name', value: 'Smith' },
      { id: 'partner1DetailsMaidenName', name: 'Maiden Name', value: 'N/A' },
      { id: 'partner1DetailsMaritalStatus', name: 'Marital Status', value: 'Single' },
      { id: 'partner1DetailsCityOfBirth', name: 'City of Birth', value: 'Johannesburg' },
      { id: 'partner1DetailsCountryOfBirth', name: 'Country of Birth', value: 'South Africa' },
      { id: 'partner1DetailsCurrentResidentialAddress', name: 'Current Residential Address', value: '123 Main Street, Cape Town' },
      { id: 'partner1DetailsPhoneNumber', name: 'Phone Number', value: '082-123-4567' },
      { id: 'partner1DetailsHighestQualification', name: "Highest Qualification", value: "Bachelor's Degree" },
      { id: 'partner1DetailsOccupation', name: 'Occupation', value: 'Engineer' },
      { id: 'partner1DetailsChoiceOfSurname', name: 'Choice of Surname', value: 'Smith' },
    ],
  },
  {
    id: 'partner2',
    name: 'Partner 2 Details',
    variables: [
      { id: 'partner2DetailsEmailAddress', name: 'Email Address', value: 'partner2@example.com' },
      { id: 'partner2DetailsIdNumber', name: 'ID Number', value: '9876543210123' },
      { id: 'partner2DetailsPassportNumberCountry', name: 'Passport Number & Country', value: 'N/A' },
      { id: 'partner2DetailsDateOfBirth', name: 'Date of Birth', value: '1992-08-20' },
      { id: 'partner2DetailsFirstName', name: 'First Name', value: 'Sarah' },
      { id: 'partner2DetailsMiddleName', name: 'Middle Name', value: 'Anne' },
      { id: 'partner2DetailsLastName', name: 'Last Name', value: 'Johnson' },
      { id: 'partner2DetailsMaidenName', name: 'Maiden Name', value: 'Johnson' },
      { id: 'partner2DetailsMaritalStatus', name: 'Marital Status', value: 'Single' },
      { id: 'partner2DetailsCityOfBirth', name: 'City of Birth', value: 'Pretoria' },
      { id: 'partner2DetailsCountryOfBirth', name: 'Country of Birth', value: 'South Africa' },
      { id: 'partner2DetailsCurrentResidentialAddress', name: 'Current Residential Address', value: '123 Main Street, Cape Town' },
      { id: 'partner2DetailsPhoneNumber', name: 'Phone Number', value: '082-987-6543' },
      { id: 'partner2DetailsHighestQualification', name: "Highest Qualification", value: "Master's Degree" },
      { id: 'partner2DetailsOccupation', name: 'Occupation', value: 'Doctor' },
      { id: 'partner2DetailsChoiceOfSurname', name: 'Choice of Surname', value: 'Smith-Johnson' },
    ],
  },
  {
    id: 'witness1',
    name: 'Witness 1 Details',
    variables: [
      { id: 'witness1DetailsIdPassportNumber', name: 'ID/Passport Number', value: '5555555555555' },
      { id: 'witness1DetailsName', name: 'First Name', value: 'Michael' },
      { id: 'witness1DetailsLastName', name: 'Last Name', value: 'Brown' },
      { id: 'witness1DetailsPhoneNumber', name: 'Phone Number', value: '082-111-2222' },
    ],
  },
  {
    id: 'witness2',
    name: 'Witness 2 Details',
    variables: [
      { id: 'witness2DetailsIdPassportNumber', name: 'ID/Passport Number', value: '6666666666666' },
      { id: 'witness2DetailsName', name: 'First Name', value: 'Amanda' },
      { id: 'witness2DetailsLastName', name: 'Last Name', value: 'White' },
      { id: 'witness2DetailsPhoneNumber', name: 'Phone Number', value: '082-333-4444' },
    ],
  },
];

// Common template examples
const TEMPLATE_EXAMPLES = [
  {
    id: 'greeting',
    name: 'Simple Greeting',
    content: '<p>Dear {{firstName}},</p>\n<p>Thank you for reaching out to us.</p>'
  },
  {
    id: 'weddingDetails',
    name: 'Wedding Details Summary',
    content: `<h3>Wedding Details</h3>
<ul>
  <li>Date & Time of Wedding: {{weddingDetailsDateTimeOfWedding}}</li>
  <li>Office Attending: {{weddingDetailsOfficeAttending}}</li>
  <li>Venue Name: {{weddingDetailsVenueName}}</li>
  <li>Venue Contact Person: {{weddingDetailsVenueContactPerson}}</li>
  <li>Venue Contact Phone: {{weddingDetailsVenueContactPhone}}</li>
</ul>`
  },
  {
    id: 'partnerDetails',
    name: 'Partner Details Summary',
    content: `<h3>Partner 1</h3>
<ul>
  <li>Email Address: {{partner1DetailsEmailAddress}}</li>
  <li>ID Number: {{partner1DetailsIdNumber}}</li>
  <li>Date of Birth: {{partner1DetailsDateOfBirth}}</li>
  <li>First Name: {{partner1DetailsFirstName}}</li>
  <li>Last Name: {{partner1DetailsLastName}}</li>
</ul>`
  }
];

export default function TemplateVariableTest() {
  const [template, setTemplate] = useState<string>('');
  const [selectedVariables, setSelectedVariables] = useState<{id: string, value: string}[]>([]);
  const [processedTemplate, setProcessedTemplate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [manualVariables, setManualVariables] = useState<{name: string, value: string}[]>([]);
  const { toast } = useToast();
  const templateRef = useRef<HTMLTextAreaElement>(null);
  
  // Define a variable name constant to avoid reference errors
  const variableID = "variableID";

  // Function to add a variable from dropdown
  const addVariableFromCategory = (categoryId: string, variableId: string) => {
    // Find the category and variable
    const category = VARIABLE_CATEGORIES.find(c => c.id === categoryId);
    const variable = category?.variables.find(v => v.id === variableId);
    
    if (!category || !variable) return;
    
    // Insert the variable into the template
    if (templateRef.current) {
      const cursorPosition = templateRef.current.selectionStart;
      const textBefore = template.substring(0, cursorPosition);
      const textAfter = template.substring(cursorPosition);
      const variableText = `{{${variable.id}}}`;
      
      setTemplate(textBefore + variableText + textAfter);
      
      // Set timeout to restore cursor position after the variable
      setTimeout(() => {
        if (templateRef.current) {
          const newPosition = cursorPosition + variableText.length;
          templateRef.current.focus();
          templateRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    } else {
      // If no cursor position, just append to the end
      setTemplate(template + `{{${variable.id}}}`);
    }
    
    toast({
      title: "Variable Added",
      description: `Added ${variable.name} to the template`
    });
  };

  // Function to add a custom variable
  const addManualVariable = () => {
    setManualVariables([...manualVariables, { name: '', value: '' }]);
  };

  // Function to update manual variable
  const updateManualVariable = (index: number, field: 'name' | 'value', value: string) => {
    const updatedVariables = [...manualVariables];
    updatedVariables[index][field] = value;
    setManualVariables(updatedVariables);
  };

  // Function to remove manual variable
  const removeManualVariable = (index: number) => {
    const updatedVariables = [...manualVariables];
    updatedVariables.splice(index, 1);
    setManualVariables(updatedVariables);
  };

  // Function to remove selected variable
  const removeSelectedVariable = (id: string) => {
    setSelectedVariables(selectedVariables.filter(v => v.id !== id));
  };

  // Function to insert a variable into the template at cursor position
  const insertVariableIntoTemplate = (variableId: string) => {
    const textarea = document.getElementById('template-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const textBefore = template.substring(0, cursorPos);
    const textAfter = template.substring(cursorPos);
    const variableTag = `{{${variableId}}}`;
    
    setTemplate(textBefore + variableTag + textAfter);
    
    // Set focus back and update cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = cursorPos + variableTag.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Function to use a template example
  const useTemplateExample = (exampleId: string) => {
    const example = TEMPLATE_EXAMPLES.find(e => e.id === exampleId);
    if (!example) return;
    setTemplate(example.content);
  };

  // Handle form submission
  const handleTest = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build variables object from selected variables
      const variablesObj: Record<string, any> = {};
      
      // Create structured data for section-based variables
      const sections: Record<string, Record<string, any>> = {
        weddingDetails: {},
        partner1Details: {},
        partner2Details: {},
        witness1Details: {},
        witness2Details: {}
      };
      
      // Add selected variables
      selectedVariables.forEach(variable => {
        // Add to flat structure
        variablesObj[variable.id] = variable.value;
        
        // Also add to structured sections to improve variable replacement
        // Check if the variable belongs to a known section
        Object.keys(sections).forEach(sectionName => {
          if (variable.id.startsWith(sectionName)) {
            // Extract the field name by removing the section prefix
            // Example: partner1DetailsFirstName -> firstName
            const fieldPart = variable.id.substring(sectionName.length);
            const fieldName = fieldPart.charAt(0).toLowerCase() + fieldPart.slice(1);
            
            // Add to the section object
            sections[sectionName][fieldName] = variable.value;
          }
        });
      });
      
      // Add the structured sections to the variables object
      Object.entries(sections).forEach(([section, fields]) => {
        if (Object.keys(fields).length > 0) {
          variablesObj[section] = fields;
        }
      });
      
      // Add manual variables
      manualVariables.forEach(variable => {
        if (variable.name) {
          variablesObj[variable.name] = variable.value;
        }
      });

      // Add debug information
      variablesObj.debug = {
        sections: Object.keys(sections).filter(s => Object.keys(sections[s]).length > 0),
        topLevelKeys: Object.keys(variablesObj).filter(k => k !== 'debug')
      };

      // Send the template and variables to the API
      const response = await fetch('/api/debug/template-variable-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template,
          variables: variablesObj,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process template');
      }

      const data = await response.json();
      setProcessedTemplate(data.processedTemplate);

      toast({
        title: 'Template Processed',
        description: `Successfully processed template with ${Object.keys(variablesObj).length - 1} variables`, // -1 to exclude debug
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Template Variable Test</h1>
        <p className="text-muted-foreground mb-6">
          Use this tool to test variable replacement in email templates.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column: Template editor and examples */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Test Template</CardTitle>
                <CardDescription>
                  Enter your template content with variables in the format: {'{{' + variableID + '}}'}
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Select onValueChange={useTemplateExample}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Select template example" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_EXAMPLES.map(example => (
                        <SelectItem key={example.id} value={example.id}>
                          {example.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="template-editor"
                  placeholder="Enter your template HTML here..."
                  className="min-h-[300px] font-mono text-sm"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  ref={templateRef}
                />
              </CardContent>
              <CardFooter>
                <Button onClick={handleTest} disabled={loading}>
                  {loading ? 'Processing...' : 'Test Template'}
                </Button>
              </CardFooter>
            </Card>

            {/* Results section */}
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md mt-6">
                {error}
              </div>
            )}

            {processedTemplate && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="rendered">
                    <TabsList>
                      <TabsTrigger value="rendered">Rendered Output</TabsTrigger>
                      <TabsTrigger value="html">HTML Source</TabsTrigger>
                    </TabsList>
                    <TabsContent value="rendered">
                      <div className="border rounded-md p-4 bg-white dark:bg-gray-950">
                        <div dangerouslySetInnerHTML={{ __html: processedTemplate }} />
                      </div>
                    </TabsContent>
                    <TabsContent value="html">
                      <Textarea
                        readOnly
                        className="min-h-[200px] font-mono text-sm"
                        value={processedTemplate}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column: Variable selection */}
          <div className="space-y-6">
            {/* Selected Variables */}
            <Card>
              <CardHeader>
                <CardTitle>Selected Variables</CardTitle>
                <CardDescription>
                  Variables that will be used in the template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedVariables.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No variables selected yet</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedVariables.map(variable => (
                        <div key={variable.id} className="flex items-center justify-between border p-2 rounded-md">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{variable.id}</span>
                            <span className="text-xs text-muted-foreground">{variable.value}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => insertVariableIntoTemplate(variable.id)}
                              title="Insert into template"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeSelectedVariable(variable.id)}
                              title="Remove variable"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Manual variables section */}
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between items-center">
                      <Label>Custom Variables</Label>
                      <Button 
                        onClick={addManualVariable} 
                        variant="outline" 
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Variable
                      </Button>
                    </div>
                    
                    {manualVariables.map((variable, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          placeholder="Name"
                          value={variable.name}
                          onChange={(e) => updateManualVariable(index, 'name', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Value"
                          value={variable.value}
                          onChange={(e) => updateManualVariable(index, 'value', e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeManualVariable(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Variable Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Available Variables</CardTitle>
                <CardDescription>
                  Choose from predefined variable categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {VARIABLE_CATEGORIES.map((category) => (
                    <AccordionItem key={category.id} value={category.id}>
                      <AccordionTrigger>{category.name}</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {category.variables.map((variable) => (
                            <div key={variable.id} className="flex justify-between items-center border-b pb-2">
                              <div className="flex flex-col">
                                <span className="text-sm">{variable.name}</span>
                                <code className="text-xs bg-muted p-1 rounded">{`{{${variable.id}}}`}</code>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => addVariableFromCategory(category.id, variable.id)}
                              >
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}