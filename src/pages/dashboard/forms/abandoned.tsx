import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FormSession {
  id: string;
  formId: string;
  startedAt: string;
  status: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  data: Record<string, any>;
  readableData: Record<string, {
    value: any;
    label: string;
    sectionTitle?: string;
    type?: string;
    isConditional?: boolean;
    conditionalLogic?: any;
  }>;
  fieldMap: Record<string, {
    label: string;
    variableName: string;
    sectionTitle?: string;
    type?: string;
    isConditional?: boolean;
    conditionalLogic?: any;
  }>;
  form: {
    id: string;
    name: string;
    type: string;
    formSections?: Array<{
      title: string;
      fields: Array<{
        id: string;
        label: string;
        type: string;
      }>;
    }>;
  };
}

interface Stats {
  totalViewed: number;
  totalStarted: number;
  totalAbandoned: number;
  totalCompleted: number;
  abandonmentRate: string;
  viewToCompletionRate: string;
  startToCompletionRate: string;
  period: string;
}

export default function AbandonedForms() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<FormSession[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [formFilter, setFormFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('7');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [forms, setForms] = useState<{ id: string; name: string }[]>([]);

  const [selectedSession, setSelectedSession] = useState<FormSession | null>(null);
  const [formSchemas, setFormSchemas] = useState<Record<string, any>>({});

  // Fetch abandoned form sessions
  const fetchAbandonedSessions = async () => {
    try {
      setLoading(true);
      let url = `/api/forms/sessions/abandoned?days=${timeFilter}`;
      
      if (formFilter !== 'all') {
        url += `&formId=${formFilter}`;
      }
      
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch abandoned sessions data');
      }
      
      const data = await response.json();
      
      if (data.sessions) {
        setSessions(data.sessions);
        setStats(data.stats || null);
      } else {
        setSessions([]);
        setStats(null);
      }
    } catch (error) {
      console.error('Error fetching abandoned sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load abandoned form sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch available forms for filtering
  const fetchForms = async () => {
    try {
      const response = await fetch('/api/forms');
      
      if (!response.ok) {
        throw new Error('Failed to fetch forms');
      }
      
      const data = await response.json();
      setForms(data.map((form: any) => ({ id: form.id, name: form.name })));
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchForms();
      fetchAbandonedSessions();
    }
  }, [user]);

  // Refetch when filters change
  useEffect(() => {
    if (user) {
      fetchAbandonedSessions();
    }
  }, [formFilter, timeFilter, statusFilter, user]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };


  // Extract name, email, and phone from form data if not directly available
  const extractContactInfo = (session: FormSession) => {
    const { readableData, data } = session;
    let name = session.name;
    let email = session.email;
    let phone = session.phone;

    // Try to find name, email, and phone in readableData
    if (readableData) {
      // Look for common field names for name
      const nameFields = ['name', 'firstName', 'fullName', 'applicantName', 'customerName'];
      for (const field of nameFields) {
        if (!name && readableData[field] && readableData[field].value) {
          name = readableData[field].value;
          break;
        }
      }

      // Look for common field names for email
      const emailFields = ['email', 'emailAddress', 'userEmail', 'contactEmail'];
      for (const field of emailFields) {
        if (!email && readableData[field] && readableData[field].value) {
          email = readableData[field].value;
          break;
        }
      }

      // Look for common field names for phone
      const phoneFields = ['phone', 'phoneNumber', 'mobileNumber', 'contactPhone', 'telephone'];
      for (const field of phoneFields) {
        if (!phone && readableData[field] && readableData[field].value) {
          phone = readableData[field].value;
          break;
        }
      }
    }

    return { name, email, phone };
  };

  // Check if a field is missing or empty
  const isFieldMissing = (value: any) => {
    return value === null || value === undefined || value === '';
  };
  
  // Format field value for display based on type
  const formatFieldValue = (value: any, fieldType?: string) => {
    if (value === null || value === undefined) return '-';
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    if (fieldType === 'select' || fieldType === 'dropdown') {
      // For select/dropdown fields, the value is often the option value
      // We'll display it as is, as we don't have access to the option label here
      return String(value);
    }
    
    return String(value);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Form Session Tracking</h1>
            <div className="flex gap-2">
              <Button onClick={() => router.push("/dashboard/forms/rule-editor")} variant="outline">
                Field Mapping & Rules
              </Button>
              <Button onClick={fetchAbandonedSessions} variant="outline">
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Form Views</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalViewed}</div>
                    <p className="text-xs text-muted-foreground">in the last {stats.period}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Form Starts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalStarted}</div>
                    <p className="text-xs text-muted-foreground">in the last {stats.period}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Completed Forms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalCompleted}</div>
                    <p className="text-xs text-muted-foreground">in the last {stats.period}</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">View to Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.viewToCompletionRate}</div>
                    <p className="text-xs text-muted-foreground">of viewed forms are completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Start to Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.startToCompletionRate}</div>
                    <p className="text-xs text-muted-foreground">of started forms are completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Overall Abandonment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.abandonmentRate}</div>
                    <p className="text-xs text-muted-foreground">of all form sessions</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter abandoned form sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="form-filter">Form</Label>
                  <Select value={formFilter} onValueChange={setFormFilter}>
                    <SelectTrigger id="form-filter">
                      <SelectValue placeholder="Select a form" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Forms</SelectItem>
                      {forms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          {form.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="viewed">Viewed</SelectItem>
                      <SelectItem value="started">Started</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time-filter">Time Period</Label>
                  <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger id="time-filter">
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Last 24 Hours</SelectItem>
                      <SelectItem value="7">Last 7 Days</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="90">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sessions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Form Sessions</CardTitle>
              <CardDescription>
                Track form sessions by status: viewed, started, or completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No form sessions found matching your filters
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Form</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Started At</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Form Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session, idx) => {
                        // Extract contact info from form data if not directly available
                        const { name, email, phone } = extractContactInfo(session);
                        
                        // Get the most important form fields to display
                        const formDataEntries = session.readableData ? 
                          Object.entries(session.readableData)
                            .filter(([key, data]) => 
                              // Filter out fields that are already shown in the main columns
                              !['name', 'email', 'phone', 'firstName', 'lastName', 'fullName', 'emailAddress', 'phoneNumber'].includes(key.toLowerCase()) && 
                              data.value !== null && 
                              data.value !== undefined && 
                              data.value !== '')
                            .slice(0, 3) : [];
                            
                        // Get all form fields for expanded view
                        const allFormFields = session.readableData ? 
                          Object.entries(session.readableData)
                            .filter(([key]) => 
                              !['name', 'email', 'phone', 'firstName', 'lastName', 'fullName', 'emailAddress', 'phoneNumber'].includes(key.toLowerCase())) : [];
                        
                        const sessionId = session.id ?? `session-${idx}`;
                            
                        return (
                          <TableRow key={sessionId}>
                            <TableCell className="font-medium">{session.form?.name ?? '-'}</TableCell>
                            <TableCell className={isFieldMissing(name) ? "text-amber-500" : ""}>
                              {name || '-'}
                            </TableCell>
                            <TableCell className={isFieldMissing(email) ? "text-amber-500" : ""}>
                              {email || '-'}
                            </TableCell>
                            <TableCell className={isFieldMissing(phone) ? "text-amber-500" : ""}>
                              {phone || '-'}
                            </TableCell>
                            <TableCell>{formatDate(session.startedAt)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                session.status === 'COMPLETED' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                  : session.status === 'VIEWED' 
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                                    : session.status === 'STARTED'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                              }`}>
                                {session.status === 'COMPLETED' 
                                  ? 'Completed' 
                                  : session.status === 'VIEWED' 
                                    ? 'Viewed' 
                                    : session.status === 'STARTED'
                                      ? 'Started'
                                      : session.status}
                              </span>
                            </TableCell>
                            <TableCell>
<Button
  variant="link"
  size="sm"
  className="p-0 h-auto text-xs flex items-center gap-1"
  onClick={async () => {
    if (!formSchemas[session.formId]) {
      try {
        const res = await fetch(`/api/forms/${session.formId}`);
        if (res.ok) {
          const schema = await res.json();
          setFormSchemas(prev => ({ ...prev, [session.formId]: schema }));
        }
      } catch (e) {
        console.error('Failed to fetch form schema', e);
      }
    }
    setSelectedSession(session);
  }}
>
  View all fields
</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      {selectedSession && (
        <Dialog open={true} onOpenChange={() => setSelectedSession(null)}>
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Form Data Details</DialogTitle>
              <DialogDescription>
                All fields for "{selectedSession.form?.name ?? 'Form'}"
              </DialogDescription>
            </DialogHeader>
            
            {/* Problematic Fields Summary */}
            {selectedSession.status !== 'COMPLETED' && formSchemas[selectedSession.formId]?.formSections && (
              <div className="mt-4 mb-6 p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 rounded-md">
                <h3 className="font-semibold text-sm mb-2">Potential Problematic Fields</h3>
                <p className="text-xs mb-2">These fields were shown to the user but not filled in:</p>
                
                {(() => {
                  // Find all required fields that weren't filled
                  const problematicFields: Array<{label: string, section: string, type: string}> = [];
                  
                  formSchemas[selectedSession.formId]?.formSections?.forEach(section => {
                    section.fields.forEach(field => {
                      const fieldData = selectedSession.data?.[field.id];
                      const isMissing = fieldData === null || fieldData === undefined || fieldData === '';
                      const fieldInfo = selectedSession.fieldMap?.[field.id];
                      
                      // Check if this field is conditional
                      const isConditional = fieldInfo?.isConditional || 
                                           field.conditionalLogic || 
                                           (typeof field.options === 'object' && field.options?.conditionalLogic);
                      
                      // Only include fields that were likely shown and required but not filled
                      if (isMissing && field.required && (!isConditional || Object.keys(selectedSession.data || {}).length > 0)) {
                        problematicFields.push({
                          label: field.label,
                          section: section.title,
                          type: field.type
                        });
                      }
                    });
                  });
                  
                  if (problematicFields.length === 0) {
                    return <p className="text-xs text-gray-500">No required fields were left empty.</p>;
                  }
                  
                  return (
                    <ul className="list-disc pl-5 space-y-1">
                      {problematicFields.map((field, idx) => (
                        <li key={idx} className="text-xs">
                          <span className="font-medium">{field.label}</span> ({field.type}) in section "{field.section}"
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            )}
            
            <div className="space-y-4 mt-4">
              {formSchemas[selectedSession.formId]?.formSections?.map((section: any, idx: number) => (
                <div key={idx}>
                  <h3 className="font-semibold mb-2">{section.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.fields.map((field: any) => {
                      // Use the field ID directly to look up data
                      // This ensures we're getting the exact field from the form data
                      const fieldData = selectedSession.data?.[field.id];
                      const isMissing = fieldData === null || fieldData === undefined || fieldData === '';
                      
                      // Get field info for display purposes
                      const fieldInfo = selectedSession.fieldMap?.[field.id];
                      
                      // Check if this field is conditional
                      const isConditional = fieldInfo?.isConditional || 
                                           field.conditionalLogic || 
                                           (typeof field.options === 'object' && field.options?.conditionalLogic);
                      
                      // Determine if field was likely shown to the user
                      // If the form has any data and this field is conditional, we assume it wasn't shown
                      // if it's missing, unless there's evidence it was interacted with
                      const wasLikelyShown = !isConditional || 
                                            !isMissing || 
                                            Object.keys(selectedSession.data || {}).length === 0;
                      
                      return (
                        <div key={field.id} className="flex flex-col">
                          <span className="font-medium text-xs flex items-center gap-1">
                            {field.label} ({field.type})
                            {isConditional && (
                              <span className="text-blue-500 text-[10px]">(conditional)</span>
                            )}
                          </span>
                          <span className={`text-xs ${
                            isMissing 
                              ? (isConditional && !wasLikelyShown 
                                  ? 'text-gray-400 italic' 
                                  : 'text-amber-500 italic')
                              : ''
                          }`}>
                            {isMissing 
                              ? (isConditional && !wasLikelyShown 
                                  ? 'Likely not shown' 
                                  : 'Not filled')
                              : formatFieldValue(fieldData, field.type)
                            }
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )) || <p>No form schema available.</p>}
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => setSelectedSession(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
