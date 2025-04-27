import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Wand2, Check, AlertTriangle, Search, Filter, Save, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RuleReference {
  id: string;
  name: string;
}

interface FieldMapping {
  fieldId: string;
  fieldLabel: string;
  stableId: string;
  fieldType: string;
  inUseByRules: boolean;
  referencingRules?: RuleReference[];
}

interface RuleCondition {
  field: string;
  operator: string;
  value: string;
}

interface EmailRule {
  id: string;
  name: string;
  templateId: string;
  template?: {
    id: string;
    name: string;
  };
  conditions: RuleCondition[] | string;
}

interface BulkRuleEditorProps {
  formId: string;
  fields: FieldMapping[];
  onRulesUpdated: () => void;
}

export function BulkRuleEditor({ formId, fields, onRulesUpdated }: BulkRuleEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('spreadsheet');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updateType, setUpdateType] = useState('stable-id');
  const [customMapping, setCustomMapping] = useState('');
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editedConditions, setEditedConditions] = useState<Record<string, Record<number, string>>>({});
  
  // Get all unique rules from the fields
  const allRules: RuleReference[] = [];
  const ruleMap = new Map<string, RuleReference>();
  
  fields.forEach(field => {
    if (field.referencingRules) {
      field.referencingRules.forEach(rule => {
        if (!ruleMap.has(rule.id)) {
          ruleMap.set(rule.id, rule);
          allRules.push(rule);
        }
      });
    }
  });

  // Fetch full rule data when the component opens
  useEffect(() => {
    if (isOpen && allRules.length > 0) {
      fetchRuleData();
    }
  }, [isOpen, allRules]);

  const fetchRuleData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/emails/rules');
      if (!response.ok) {
        throw new Error('Failed to fetch rules');
      }
      const data = await response.json();
      
      // Filter rules to only include those referenced in fields
      const ruleIds = allRules.map(rule => rule.id);
      const filteredRules = data.filter((rule: EmailRule) => ruleIds.includes(rule.id));
      
      setRules(filteredRules);
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast({
        title: "Error",
        description: "Failed to load rule data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter fields based on search term
  const filteredFields = fields.filter(field => {
    if (!searchTerm) return true;
    
    return (
      field.fieldLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.fieldId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.stableId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.fieldType.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // Toggle field selection
  const toggleField = (fieldId: string) => {
    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter(id => id !== fieldId));
    } else {
      setSelectedFields([...selectedFields, fieldId]);
    }
  };
  
  // Toggle rule selection
  const toggleRule = (ruleId: string) => {
    if (selectedRules.includes(ruleId)) {
      setSelectedRules(selectedRules.filter(id => id !== ruleId));
    } else {
      setSelectedRules([...selectedRules, ruleId]);
    }
  };
  
  // Select all fields
  const selectAllFields = () => {
    setSelectedFields(filteredFields.map(field => field.fieldId));
  };
  
  // Deselect all fields
  const deselectAllFields = () => {
    setSelectedFields([]);
  };
  
  // Select all rules
  const selectAllRules = () => {
    setSelectedRules(allRules.map(rule => rule.id));
  };
  
  // Deselect all rules
  const deselectAllRules = () => {
    setSelectedRules([]);
  };

  // Parse conditions from rule
  const parseConditions = (rule: EmailRule): RuleCondition[] => {
    if (!rule.conditions) return [];
    
    try {
      if (typeof rule.conditions === 'string') {
        return JSON.parse(rule.conditions);
      } else if (Array.isArray(rule.conditions)) {
        return rule.conditions;
      }
    } catch (e) {
      console.error('Error parsing conditions:', e);
    }
    
    return [];
  };

  // Handle condition edit
  const handleConditionEdit = (ruleId: string, conditionIndex: number, value: string) => {
    setEditedConditions(prev => ({
      ...prev,
      [ruleId]: {
        ...(prev[ruleId] || {}),
        [conditionIndex]: value
      }
    }));
  };

  // Get condition value (either edited or original)
  const getConditionValue = (rule: EmailRule, conditionIndex: number): string => {
    const conditions = parseConditions(rule);
    const condition = conditions[conditionIndex];
    
    // Check if there's an edited value
    if (editedConditions[rule.id]?.[conditionIndex] !== undefined) {
      return editedConditions[rule.id][conditionIndex];
    }
    
    // Return original value
    return condition?.field || '';
  };
  
  // Process the bulk update
  const processBulkUpdate = async () => {
    if (selectedFields.length === 0 || selectedRules.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one field and one rule to update.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      const response = await fetch(`/api/forms/${formId}/field-mappings?action=bulk-update-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fieldIds: selectedFields,
          ruleIds: selectedRules,
          updateType,
          customMapping: updateType === 'custom' ? customMapping : undefined
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update rules');
      }
      
      const result = await response.json();
      
      toast({
        title: "Rules Updated",
        description: result.message || `Updated ${result.updatedRules?.length || 0} rules successfully.`,
        variant: "default"
      });
      
      // Reset state
      setSelectedFields([]);
      setSelectedRules([]);
      setIsOpen(false);
      
      // Notify parent component to refresh data
      onRulesUpdated();
      
    } catch (error) {
      console.error('Error updating rules:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save edited conditions
  const saveConditionEdits = async () => {
    // Implementation would go here
    toast({
      title: "Not Implemented",
      description: "Direct condition editing is not yet implemented",
      variant: "default"
    });
  };
  
  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
        variant="outline"
      >
        <Wand2 className="h-4 w-4" />
        Bulk Rule Editor
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Bulk Rule Editor</DialogTitle>
            <DialogDescription>
              Update multiple email rules at once to use consistent field references.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="spreadsheet">Spreadsheet View</TabsTrigger>
              <TabsTrigger value="update">Update Rules</TabsTrigger>
            </TabsList>
            
            <TabsContent value="spreadsheet" className="space-y-4 pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search rules..."
                    className="w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    prefix={<Search className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={saveConditionEdits} disabled={Object.keys(editedConditions).length === 0}>
                    <Save className="h-4 w-4 mr-1" /> Save Changes
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[calc(90vh-220px)] border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[200px]">Rule Name</TableHead>
                      <TableHead className="w-[100px]">Rule ID</TableHead>
                      <TableHead className="w-[200px]">Template</TableHead>
                      <TableHead className="w-[100px]">Template ID</TableHead>
                      <TableHead className="w-[150px]">Condition 1</TableHead>
                      <TableHead className="w-[150px]">Condition 2</TableHead>
                      <TableHead className="w-[150px]">Condition 3</TableHead>
                      <TableHead className="w-[150px]">Condition 4</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading rule data...
                        </TableCell>
                      </TableRow>
                    ) : rules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No rules found for this form
                        </TableCell>
                      </TableRow>
                    ) : (
                      rules.map(rule => {
                        const conditions = parseConditions(rule);
                        return (
                          <TableRow key={rule.id}>
                            <TableCell className="font-medium">{rule.name}</TableCell>
                            <TableCell className="font-mono text-xs">{rule.id.substring(0, 8)}...</TableCell>
                            <TableCell>{rule.template?.name || 'Unknown Template'}</TableCell>
                            <TableCell className="font-mono text-xs">{rule.templateId.substring(0, 8)}...</TableCell>
                            
                            {/* Condition cells - show up to 4 conditions */}
                            {[0, 1, 2, 3].map(index => (
                              <TableCell key={`${rule.id}-condition-${index}`}>
                                {index < conditions.length ? (
                                  <select
                                    value={getConditionValue(rule, index)}
                                    onChange={(e) => handleConditionEdit(rule.id, index, e.target.value)}
                                    className="h-8 text-sm w-full rounded-md border bg-background px-3 py-1"
                                  >
                                    <option value="">Select a field</option>
                                    {fields.map(field => (
                                      <option key={field.fieldId} value={field.stableId}>
                                        {field.fieldLabel} ({field.stableId})
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <select
                                    onChange={(e) => handleConditionEdit(rule.id, index, e.target.value)}
                                    className="h-8 text-sm w-full rounded-md border bg-background px-3 py-1"
                                  >
                                    <option value="">Select a field</option>
                                    {fields.map(field => (
                                      <option key={field.fieldId} value={field.stableId}>
                                        {field.fieldLabel} ({field.stableId})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Changes made in the spreadsheet view are not automatically saved. Click "Save Changes" to apply your edits.
                </AlertDescription>
              </Alert>
            </TabsContent>
            
            <TabsContent value="update" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Field Selection */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Select Fields</CardTitle>
                    <CardDescription>
                      Choose which form fields to update in rules
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Search fields..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="sm" variant="outline" onClick={selectAllFields}>
                        Select All
                      </Button>
                      <Button size="sm" variant="outline" onClick={deselectAllFields}>
                        Clear
                      </Button>
                    </div>
                    
                    <div className="border rounded-md h-60 overflow-y-auto p-2">
                      {filteredFields.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          No fields match your search
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredFields.map(field => (
                            <div 
                              key={field.fieldId} 
                              className={`flex items-center p-2 rounded-md ${selectedFields.includes(field.fieldId) ? 'bg-muted' : ''}`}
                            >
                              <input
                                type="checkbox"
                                id={`field-${field.fieldId}`}
                                checked={selectedFields.includes(field.fieldId)}
                                onChange={() => toggleField(field.fieldId)}
                                className="mr-2 h-4 w-4"
                              />
                              <label 
                                htmlFor={`field-${field.fieldId}`}
                                className="flex-1 cursor-pointer text-sm"
                              >
                                <div className="font-medium">{field.fieldLabel}</div>
                                <div className="text-xs text-muted-foreground">{field.fieldType}</div>
                              </label>
                              {field.inUseByRules && (
                                <div className="text-xs text-amber-500 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {field.referencingRules?.length || 0}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {selectedFields.length} of {filteredFields.length} fields selected
                    </div>
                  </CardContent>
                </Card>
                
                {/* Rule Selection */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Select Rules</CardTitle>
                    <CardDescription>
                      Choose which email rules to update
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={selectAllRules}>
                        Select All
                      </Button>
                      <Button size="sm" variant="outline" onClick={deselectAllRules}>
                        Clear
                      </Button>
                    </div>
                    
                    <div className="border rounded-md h-60 overflow-y-auto p-2">
                      {allRules.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          No email rules found for this form
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {allRules.map(rule => (
                            <div 
                              key={rule.id} 
                              className={`flex items-center p-2 rounded-md ${selectedRules.includes(rule.id) ? 'bg-muted' : ''}`}
                            >
                              <input
                                type="checkbox"
                                id={`rule-${rule.id}`}
                                checked={selectedRules.includes(rule.id)}
                                onChange={() => toggleRule(rule.id)}
                                className="mr-2 h-4 w-4"
                              />
                              <label 
                                htmlFor={`rule-${rule.id}`}
                                className="flex-1 cursor-pointer text-sm"
                              >
                                {rule.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {selectedRules.length} of {allRules.length} rules selected
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Update Options */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Update Options</CardTitle>
                  <CardDescription>
                    Choose how to update field references in the selected rules
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="update-type">Reference Type</Label>
                        <Select 
                          value={updateType} 
                          onValueChange={setUpdateType}
                        >
                          <SelectTrigger id="update-type">
                            <SelectValue placeholder="Select reference type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stable-id">Use Stable IDs (Recommended)</SelectItem>
                            <SelectItem value="field-id">Use Field IDs</SelectItem>
                            <SelectItem value="custom">Use Custom Mapping</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {updateType === 'custom' && (
                        <div>
                          <Label htmlFor="custom-mapping">Custom Mapping Pattern</Label>
                          <Input
                            id="custom-mapping"
                            placeholder="e.g., {fieldName}"
                            value={customMapping}
                            onChange={(e) => setCustomMapping(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Important</AlertTitle>
                      <AlertDescription>
                        {updateType === 'stable-id' ? (
                          "Using stable IDs is recommended as they won't change even if you rename or reorder fields."
                        ) : updateType === 'field-id' ? (
                          "Field IDs may change if you duplicate the form or make significant changes."
                        ) : (
                          "Custom mappings require careful management to ensure they remain consistent."
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            {selectedTab === 'update' && (
              <Button onClick={processBulkUpdate} disabled={isProcessing || selectedFields.length === 0 || selectedRules.length === 0}>
                {isProcessing ? 'Processing...' : 'Update Rules'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}