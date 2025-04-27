import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ChevronLeft, AlertTriangle, Search, Save, Filter, Info } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

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
    subject?: string;
  };
  conditions: RuleCondition[] | string;
}

export default function BulkRuleEditorPage() {
  const router = useRouter();
  const { id } = router.query;
  const formId = typeof id === 'string' ? id : '';
  
  const [formName, setFormName] = useState<string>('');
  const [fields, setFields] = useState<FieldMapping[]>([]);
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('rule-details');
  const [editedConditions, setEditedConditions] = useState<Record<string, Record<number, string>>>({});
  
  // Toggle states
  const [showInactiveRules, setShowInactiveRules] = useState(true);
  const [showRulesWithoutConditions, setShowRulesWithoutConditions] = useState(true);
  const [showTemplateDetails, setShowTemplateDetails] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!formId) return;
    
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch form details
        const formResponse = await fetch(`/api/forms/${formId}`);
        if (!formResponse.ok) {
          throw new Error(`Failed to fetch form details: ${formResponse.statusText}`);
        }
        const formData = await formResponse.json();
        setFormName(formData.name || 'Unnamed Form');
        
        // Fetch field mappings
        const mappingsResponse = await fetch(`/api/forms/${formId}/field-mappings`);
        if (!mappingsResponse.ok) {
          throw new Error(`Failed to fetch field mappings: ${mappingsResponse.statusText}`);
        }
        const mappingsData = await mappingsResponse.json();
        setFields(mappingsData.fieldMappings || []);
        
        // Extract rule IDs from field mappings
        const ruleIds = new Set<string>();
        mappingsData.fieldMappings.forEach((field: FieldMapping) => {
          if (field.referencingRules) {
            field.referencingRules.forEach(rule => {
              ruleIds.add(rule.id);
            });
          }
        });
        
        // Only fetch rules if we have rule IDs from field mappings
        if (ruleIds.size > 0) {
          // Fetch rules
          const rulesResponse = await fetch('/api/emails/rules');
          if (!rulesResponse.ok) {
            throw new Error(`Failed to fetch email rules: ${rulesResponse.statusText}`);
          }
          const rulesData = await rulesResponse.json();
          
          // Filter rules to only include those referenced in fields
          const filteredRules = rulesData.filter((rule: EmailRule) => ruleIds.has(rule.id));
          setRules(filteredRules);
        } else {
          // No rules are referenced in field mappings
          setRules([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to load data',
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [formId, retryCount]);

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
  
  // Reset changes for a specific rule
  const resetRuleChanges = (ruleId: string) => {
    setEditedConditions(prev => {
      const newState = { ...prev };
      delete newState[ruleId];
      return newState;
    });
    
    toast({
      title: "Changes Reset",
      description: "Changes for this rule have been discarded",
      variant: "default"
    });
  };
  
  // Reset all changes
  const resetAllChanges = () => {
    setEditedConditions({});
    
    toast({
      title: "All Changes Reset",
      description: "All unsaved changes have been discarded",
      variant: "default"
    });
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

  // Save edited conditions
  const saveConditionEdits = async () => {
    if (Object.keys(editedConditions).length === 0) {
      toast({
        title: "No Changes",
        description: "No changes to save",
        variant: "default"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Prepare updates array
      const updates = Object.entries(editedConditions).map(([ruleId, conditionEdits]) => {
        // Find the rule
        const rule = rules.find(r => r.id === ruleId);
        if (!rule) return null;
        
        // Get original conditions
        const originalConditions = parseConditions(rule);
        
        // Apply edits to conditions
        const updatedConditions = [...originalConditions];
        Object.entries(conditionEdits).forEach(([indexStr, value]) => {
          const index = parseInt(indexStr, 10);
          if (index >= 0 && index < updatedConditions.length) {
            updatedConditions[index] = {
              ...updatedConditions[index],
              field: value
            };
          }
        });
        
        return {
          ruleId,
          conditions: updatedConditions
        };
      }).filter(Boolean);

      // Send updates to API
      const response = await fetch('/api/emails/rules/update-conditions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: "Rule conditions updated successfully",
          variant: "default"
        });
        
        // Clear edited conditions
        setEditedConditions({});
        
        // Refresh data
        setRetryCount(prev => prev + 1);
      } else {
        // Handle partial success or failure
        const failedUpdates = result.results?.filter(r => !r.success) || [];
        if (failedUpdates.length > 0) {
          toast({
            title: "Partial Success",
            description: `${result.results.length - failedUpdates.length} of ${result.results.length} updates succeeded`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to update rule conditions",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error saving condition edits:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter rules based on search term and toggle states
  const filteredRules = rules.filter(rule => {
    if (!showInactiveRules && !rule.template?.name) {
      return false;
    }
    
    if (!showRulesWithoutConditions) {
      const conditions = parseConditions(rule);
      if (conditions.length === 0) {
        return false;
      }
    }
    
    if (!searchTerm) return true;
    
    return (
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rule.template?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard/forms">Forms</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/dashboard/forms/${formId}/edit`}>{formName || '...'}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/dashboard/forms/${formId}/field-mappings`}>Field Mappings</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Bulk Rule Editor</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <Button variant="outline" asChild>
            <Link href={`/dashboard/forms/${formId}/field-mappings`}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Field Mappings
            </Link>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Bulk Rule Editor</CardTitle>
            <CardDescription>
              View and edit email rules associated with this form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {!isLoading && !error && rules.length === 0 && (
                <Alert className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertTitle>No rules found for this form</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      This form doesn't have any email rules associated with its fields. Email rules allow you to 
                      automatically send emails based on form submissions when certain conditions are met.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                      className="mt-1"
                    >
                      <Link href="/dashboard/emails/rules/new">
                        Create New Rule
                      </Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Toggle Switches */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="show-inactive-rules" 
                    checked={showInactiveRules} 
                    onCheckedChange={setShowInactiveRules}
                  />
                  <Label htmlFor="show-inactive-rules">Show Inactive Rules</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="show-rules-without-conditions" 
                    checked={showRulesWithoutConditions} 
                    onCheckedChange={setShowRulesWithoutConditions}
                  />
                  <Label htmlFor="show-rules-without-conditions">Show Rules Without Conditions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="show-template-details" 
                    checked={showTemplateDetails} 
                    onCheckedChange={setShowTemplateDetails}
                  />
                  <Label htmlFor="show-template-details">Show Template Details</Label>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search rules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  {Object.keys(editedConditions).length > 0 && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={resetAllChanges}
                      disabled={isSaving}
                    >
                      Reset All
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={saveConditionEdits} 
                    disabled={Object.keys(editedConditions).length === 0 || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" /> Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="rule-details">Rule Details</TabsTrigger>
                  <TabsTrigger value="conditions">
                    Conditions
                    {Object.keys(editedConditions).length > 0 && (
                      <Badge variant="outline" className="ml-2 bg-primary text-primary-foreground">
                        {Object.keys(editedConditions).length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="rule-details" className="space-y-4 pt-4">
                  <ScrollArea className="h-[calc(100vh-400px)] border rounded-md">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-[200px]">Rule Name</TableHead>
                          <TableHead className="w-[100px]">Rule ID</TableHead>
                          {showTemplateDetails && (
                            <>
                              <TableHead className="w-[200px]">Template Name</TableHead>
                              <TableHead className="w-[100px]">Template ID</TableHead>
                              <TableHead className="w-[200px]">Subject</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={showTemplateDetails ? 5 : 2} className="text-center py-8">
                              Loading rule data...
                            </TableCell>
                          </TableRow>
                        ) : error ? (
                          <TableRow>
                            <TableCell colSpan={showTemplateDetails ? 5 : 2} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                                <p className="text-destructive font-medium">Error loading rules</p>
                                <p className="text-sm text-muted-foreground mb-2">{error}</p>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setRetryCount(prev => prev + 1)}
                                >
                                  Retry
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredRules.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={showTemplateDetails ? 5 : 2} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <Info className="h-6 w-6 text-muted-foreground" />
                                <p className="font-medium">No rules found for this form</p>
                                <p className="text-sm text-muted-foreground max-w-md">
                                  This form doesn't have any email rules associated with its fields. 
                                  You can create rules in the Email Rules section that reference fields from this form.
                                </p>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  asChild
                                  className="mt-2"
                                >
                                  <Link href="/dashboard/emails/rules/new">
                                    Create New Rule
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRules.map(rule => (
                            <TableRow key={rule.id}>
                              <TableCell className="font-medium">
                                <Link href={`/dashboard/emails/rules/${rule.id}`} className="hover:underline">
                                  {rule.name}
                                </Link>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{rule.id.substring(0, 8)}...</TableCell>
                              {showTemplateDetails && (
                                <>
                                  <TableCell>{rule.template?.name || 'Unknown Template'}</TableCell>
                                  <TableCell className="font-mono text-xs">{rule.templateId.substring(0, 8)}...</TableCell>
                                  <TableCell>{rule.template?.subject || '-'}</TableCell>
                                </>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="conditions" className="space-y-4 pt-4">
                  <ScrollArea className="h-[calc(100vh-400px)] border rounded-md">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-[200px]">Condition Name</TableHead>
                          <TableHead className="w-[200px]">Condition Description</TableHead>
                          <TableHead className="w-[150px]">Condition 1</TableHead>
                          <TableHead className="w-[150px]">Condition 2</TableHead>
                          <TableHead className="w-[150px]">Condition 3</TableHead>
                          <TableHead className="w-[150px]">Condition 4</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              Loading condition data...
                            </TableCell>
                          </TableRow>
                        ) : error ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                                <p className="text-destructive font-medium">Error loading rules</p>
                                <p className="text-sm text-muted-foreground mb-2">{error}</p>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setRetryCount(prev => prev + 1)}
                                >
                                  Retry
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredRules.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <Info className="h-6 w-6 text-muted-foreground" />
                                <p className="font-medium">No rules found for this form</p>
                                <p className="text-sm text-muted-foreground max-w-md">
                                  This form doesn't have any email rules associated with its fields. 
                                  You can create rules in the Email Rules section that reference fields from this form.
                                </p>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  asChild
                                  className="mt-2"
                                >
                                  <Link href="/dashboard/emails/rules/new">
                                    Create New Rule
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRules.map(rule => {
                            const conditions = parseConditions(rule);
                            return (
                              <TableRow key={rule.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center justify-between">
                                    <span>{rule.name}</span>
                                    {editedConditions[rule.id] && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => resetRuleChanges(rule.id)}
                                        className="h-6 px-2 text-xs"
                                      >
                                        Reset
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>Rule conditions for {rule.template?.name || 'unknown template'}</TableCell>
                                
                                {/* Condition cells - show up to 4 conditions */}
                                {[0, 1, 2, 3].map(index => (
                                  <TableCell key={`${rule.id}-condition-${index}`}>
                                    {index < conditions.length ? (
                                      <select
                                        value={getConditionValue(rule, index)}
                                        onChange={(e) => handleConditionEdit(rule.id, index, e.target.value)}
                                        className={`h-8 text-sm w-full rounded-md border ${editedConditions[rule.id]?.[index] !== undefined ? 'border-primary' : 'border-input'} bg-background px-3 py-1`}
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
                                        className="h-8 text-sm w-full rounded-md border border-input bg-background px-3 py-1"
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
                      Changes made to conditions are not automatically saved. Click "Save Changes" to apply your edits.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}