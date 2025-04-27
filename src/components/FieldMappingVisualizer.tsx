import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { AlertCircle, AlertTriangle, Info, ExternalLink, ArrowUpRight, Wand2, Check, Edit, Pencil } from 'lucide-react';
import { BulkRuleEditor } from './BulkRuleEditor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface RuleReference {
  id: string;
  name: string;
}

interface FieldMapping {
  fieldId: string;
  fieldLabel: string;
  mappedTo: string[];
  fieldType: string;
  stableId: string;
  inUseByRules: boolean;
  referencingRules?: RuleReference[];
}

interface FieldMappingVisualizerProps {
  formId: string;
}

export function FieldMappingVisualizer({ formId }: FieldMappingVisualizerProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [updatingRules, setUpdatingRules] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [affectedRules, setAffectedRules] = useState<RuleReference[]>([]);

  useEffect(() => {
    if (!formId) return;
    
    async function fetchFieldMappings() {
      try {
        setLoading(true);
        const response = await fetch(`/api/forms/${formId}/field-mappings`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch field mappings: ${response.statusText}`);
        }
        
        const data = await response.json();
        setMappings(data.fieldMappings || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching field mappings:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to load field mappings: ${err instanceof Error ? err.message : 'Unknown error'}`
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchFieldMappings();
  }, [formId]);

  // Filter mappings based on search term and active tab
  const filteredMappings = mappings.filter(mapping => {
    const matchesSearch = 
      mapping.fieldLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapping.fieldId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapping.stableId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapping.mappedTo.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'all') {
      return matchesSearch;
    } else if (activeTab === 'mapped') {
      return matchesSearch && mapping.mappedTo.length > 1;
    } else if (activeTab === 'unmapped') {
      return matchesSearch && mapping.mappedTo.length <= 1;
    } else if (activeTab === 'in-use') {
      return matchesSearch && mapping.inUseByRules;
    }
    
    return matchesSearch;
  });

  const fieldsInUseCount = mappings.filter(m => m.inUseByRules).length;
  
  // Handle selecting a field for bulk update
  const toggleFieldSelection = (fieldId: string) => {
    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter(id => id !== fieldId));
    } else {
      setSelectedFields([...selectedFields, fieldId]);
    }
  };
  
  // Prepare for bulk update by collecting affected rules
  const prepareForBulkUpdate = () => {
    const rules: RuleReference[] = [];
    const ruleMap = new Map<string, RuleReference>();
    
    // Collect all unique rules that reference the selected fields
    selectedFields.forEach(fieldId => {
      const mapping = mappings.find(m => m.fieldId === fieldId);
      if (mapping && mapping.referencingRules) {
        mapping.referencingRules.forEach(rule => {
          if (!ruleMap.has(rule.id)) {
            ruleMap.set(rule.id, rule);
            rules.push(rule);
          }
        });
      }
    });
    
    setAffectedRules(rules);
    setUpdateDialogOpen(true);
  };
  
  // Perform the bulk update
  const performBulkUpdate = async () => {
    if (selectedFields.length === 0 || affectedRules.length === 0) {
      toast({
        title: "No changes to make",
        description: "Please select fields that are used in email rules.",
        variant: "default"
      });
      return;
    }
    
    try {
      setUpdatingRules(true);
      
      const response = await fetch(`/api/forms/${formId}/field-mappings?action=update-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fieldIds: selectedFields,
          ruleIds: affectedRules.map(rule => rule.id)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update rules');
      }
      
      const result = await response.json();
      
      toast({
        title: "Rules updated successfully",
        description: result.message,
        variant: "default"
      });
      
      // Reset selection and refresh data
      setSelectedFields([]);
      setUpdateDialogOpen(false);
      
      // Refresh the field mappings
      const refreshResponse = await fetch(`/api/forms/${formId}/field-mappings`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setMappings(refreshData.fieldMappings || []);
      }
      
    } catch (err) {
      console.error('Error updating rules:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update rules',
        variant: "destructive"
      });
    } finally {
      setUpdatingRules(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Field ID Mappings & Rule Usage</CardTitle>
        <CardDescription>
          This table shows all form fields, their stable IDs, and which email rules reference them
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <p>Loading field mappings...</p>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 p-4 rounded-md text-destructive">
            <p>{error}</p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 space-y-4">
              <div className="flex justify-between items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="search-mappings">Search</Label>
                  <Input
                    id="search-mappings"
                    placeholder="Search by field label, ID, or mapping..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2"
                    asChild
                  >
                    <Link href={`/dashboard/forms/${formId}/bulk-rule-editor`}>
                      <Wand2 className="h-4 w-4" />
                      Bulk Rule Editor
                    </Link>
                  </Button>
                  
                  {selectedFields.length > 0 && (
                    <Button 
                      onClick={prepareForBulkUpdate}
                      className="flex items-center gap-2"
                    >
                      <Wand2 className="h-4 w-4" />
                      Update {selectedFields.length} {selectedFields.length === 1 ? 'Field' : 'Fields'} to Use Stable IDs
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {filteredMappings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No field mappings found matching your criteria
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Field Label</TableHead>
                      <TableHead>Field ID</TableHead>
                      <TableHead>Stable ID</TableHead>
                      <TableHead>Field Type</TableHead>
                      <TableHead>Used In Rules</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMappings.map((mapping) => (
                      <TableRow key={mapping.fieldId}>
                        <TableCell>
                          <input 
                            type="checkbox" 
                            checked={selectedFields.includes(mapping.fieldId)}
                            onChange={() => toggleFieldSelection(mapping.fieldId)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{mapping.fieldLabel}</TableCell>
                        <TableCell className="font-mono text-xs">{mapping.fieldId}</TableCell>
                        <TableCell className="font-mono text-xs">
                          <Badge variant="outline" className="bg-muted">
                            {mapping.stableId}
                          </Badge>
                        </TableCell>
                        <TableCell>{mapping.fieldType}</TableCell>
                        <TableCell>
                          {mapping.inUseByRules ? (
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <Button variant="link" className="h-auto p-0">
                                  {mapping.referencingRules?.length || 0} {(mapping.referencingRules?.length || 0) === 1 ? 'Rule' : 'Rules'}
                                </Button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="font-medium">Referenced in Rules:</h4>
                                  <ul className="space-y-1">
                                    {mapping.referencingRules?.map(rule => (
                                      <li key={rule.id} className="flex items-center justify-between">
                                        <span className="text-sm truncate">{rule.name}</span>
                                        <Link href={`/dashboard/emails/rules/${rule.id}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                          <span>Edit</span>
                                          <ArrowUpRight className="h-3 w-3" />
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          ) : (
                            <span>Not used</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">Edit</span>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                <strong>Note:</strong> Email rules can reference fields using any of the mapped values,
                but the stable ID is the most reliable reference that won't change even if you modify the field.
              </p>
            </div>
            
            {/* Bulk Update Dialog */}
            <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Email Rules to Use Stable IDs</DialogTitle>
                  <DialogDescription>
                    This will update all selected email rules to reference the stable IDs of the selected fields.
                    This ensures that your rules will continue to work even if field labels or positions change.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                  <h4 className="font-medium mb-2">Selected Fields:</h4>
                  <ul className="space-y-1 mb-4">
                    {selectedFields.map(fieldId => {
                      const field = mappings.find(m => m.fieldId === fieldId);
                      return field ? (
                        <li key={fieldId} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{field.fieldLabel}</span>
                          <Badge variant="outline" className="font-mono text-xs">
                            {field.stableId}
                          </Badge>
                        </li>
                      ) : null;
                    })}
                  </ul>
                  
                  <h4 className="font-medium mb-2">Affected Rules:</h4>
                  {affectedRules.length === 0 ? (
                    <p className="text-muted-foreground">No rules will be affected by this change.</p>
                  ) : (
                    <ul className="space-y-1">
                      {affectedRules.map(rule => (
                        <li key={rule.id} className="flex items-center justify-between">
                          <span>{rule.name}</span>
                          <Link href={`/dashboard/emails/rules/${rule.id}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                            <span>View</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <Alert className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Why use stable IDs?</AlertTitle>
                  <AlertDescription>
                    Stable IDs remain the same even when you rename or reorder fields in your form.
                    This ensures your email rules continue to work correctly after form updates.
                  </AlertDescription>
                </Alert>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={performBulkUpdate} 
                    disabled={updatingRules || affectedRules.length === 0}
                  >
                    {updatingRules ? 'Updating...' : 'Update Rules'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}