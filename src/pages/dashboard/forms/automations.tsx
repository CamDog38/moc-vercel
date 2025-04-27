import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Mail as LucideMail, AlertCircle, CheckCircle, FileText, Filter, ArrowRight, Folder, FolderPlus, Plus } from 'lucide-react';
import { error } from '@/util/logger';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Form = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type EmailRule = {
  id: string;
  name: string;
  formId: string;
  templateId: string;
  active: boolean;
  conditions: string;
  folder?: string | null;
  createdAt: string;
  updatedAt: string;
  form?: Form;
  template?: EmailTemplate;
};

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
};

type EmailLog = {
  id: string;
  templateId: string;
  recipient: string;
  subject: string;
  status: string;
  createdAt: string;
  formSubmissionId: string | null;
  template?: EmailTemplate;
};

type FormSubmission = {
  id: string;
  formId: string;
  data: any;
  createdAt: string;
  leadId?: string;
  bookingId?: string;
  emailLogs?: EmailLog[];
  form?: Form;
};

interface FormAutomationsProps {
  formSystem2?: boolean;
}

export default function FormAutomations({ formSystem2 = false }: FormAutomationsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Form[]>([]);
  const [emailRules, setEmailRules] = useState<EmailRule[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [renameFolderDialogOpen, setRenameFolderDialogOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<string | null>(null);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');

  useEffect(() => {
    fetchData();
  }, [formSystem2]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch forms based on the form system toggle
      const formsEndpoint = formSystem2 ? '/api/forms2' : '/api/forms';
      console.log(`Fetching forms from: ${formsEndpoint}`, { formSystem2 });
      
      const formsResponse = await fetch(formsEndpoint);
      if (!formsResponse.ok) {
        console.error(`Failed to fetch forms from ${formsEndpoint}`, { status: formsResponse.status });
        throw new Error(`Failed to fetch ${formSystem2 ? 'Form System 2.0' : 'legacy'} forms`);
      }
      
      const formsData = await formsResponse.json();
      console.log(`Forms data received from ${formsEndpoint}:`, formsData);
      setForms(formsData);

      // Fetch email rules
      const rulesResponse = await fetch('/api/emails/rules');
      if (!rulesResponse.ok) throw new Error('Failed to fetch email rules');
      const rulesData = await rulesResponse.json();
      setEmailRules(rulesData);

      // Fetch recent form submissions
      const submissionsResponse = await fetch('/api/forms/submissions?limit=50');
      if (!submissionsResponse.ok) throw new Error('Failed to fetch form submissions');
      const submissionsData = await submissionsResponse.json();
      setFormSubmissions(submissionsData);

      // Fetch email logs
      const logsResponse = await fetch('/api/emails/logs?limit=50');
      if (!logsResponse.ok) throw new Error('Failed to fetch email logs');
      const logsData = await logsResponse.json();
      setEmailLogs(logsData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to load data',
      });
    } finally {
      setLoading(false);
    }
  };

  // Extract unique folders from email rules
  const folders = useMemo(() => {
    const folderSet = new Set<string>();
    emailRules.forEach(rule => {
      if (rule.folder) {
        folderSet.add(rule.folder);
      }
    });
    return Array.from(folderSet).sort();
  }, [emailRules]);
  
  // Group email rules by folder
  const groupedEmailRules = useMemo(() => {
    // If a folder is selected, only show rules from that folder
    const filteredRules = selectedFolder !== null
      ? emailRules.filter(r => selectedFolder === "uncategorized" ? !r.folder : r.folder === selectedFolder)
      : emailRules;
    
    // Group rules by folder
    const groups = new Map<string, EmailRule[]>();
    
    filteredRules.forEach(rule => {
      const folder = rule.folder || '';
      if (!groups.has(folder)) {
        groups.set(folder, []);
      }
      groups.get(folder)!.push(rule);
    });
    
    // Convert to array of [folder, rules] pairs and sort by folder name
    return Array.from(groups.entries()).sort((a, b) => {
      // Put "uncategorized" (empty string) at the end
      if (a[0] === '' && b[0] !== '') return 1;
      if (a[0] !== '' && b[0] === '') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [emailRules, selectedFolder]);

  // Get forms with active email rules
  const formsWithRules = forms.map(form => {
    const formRules = emailRules.filter(rule => rule.formId === form.id);
    return {
      ...form,
      rules: formRules,
      hasActiveRules: formRules.some(rule => rule.active)
    };
  });

  // Get submissions with email logs
  const submissionsWithLogs = formSubmissions.map(submission => {
    const submissionLogs = emailLogs.filter(log => log.formSubmissionId === submission.id);
    return {
      ...submission,
      emailLogs: submissionLogs,
      hasEmailsSent: submissionLogs.length > 0
    };
  });
  
  const handleRenameFolder = async (oldFolder: string, newFolder: string) => {
    try {
      // Update all rules in the old folder to use the new folder name
      const rulesToUpdate = emailRules.filter(r => r.folder === oldFolder);
      
      // Update each rule
      await Promise.all(rulesToUpdate.map(rule =>
        fetch(`/api/emails/rules/${rule.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            folder: newFolder,
          }),
        })
      ));

      // Refresh rules to update the UI
      fetchData();
      
      toast({
        title: "Folder Renamed",
        description: `Folder "${oldFolder}" has been renamed to "${newFolder}"`,
      });
      
      setRenameFolderDialogOpen(false);
      setFolderToRename(null);
      setNewFolderNameInput('');
    } catch (err) {
      console.error('Error renaming folder:', err);
      toast({
        title: "Error",
        description: "Failed to rename folder",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Form Automations</h1>
          <div className="flex gap-2">
            <Link href="/dashboard/forms">
              <Button variant="outline">Back to Forms</Button>
            </Link>
            <Link href="/dashboard/emails/rules/new">
              <Button>Create New Rule</Button>
            </Link>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <Tabs defaultValue="forms">
            <TabsList className="mb-6">
              <TabsTrigger value="forms">Forms with Rules</TabsTrigger>
              <TabsTrigger value="submissions">Recent Submissions</TabsTrigger>
              <TabsTrigger value="logs">Email Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="forms">
              <Card>
                <CardHeader>
                  <CardTitle>Forms with Email Automations</CardTitle>
                  <CardDescription>
                    Overview of forms that have email rules configured
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Form Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rules</TableHead>
                        <TableHead>Active Rules</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formsWithRules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No forms with email rules found
                          </TableCell>
                        </TableRow>
                      ) : (
                        formsWithRules.map(form => (
                          <TableRow key={form.id}>
                            <TableCell className="font-medium">{form.name}</TableCell>
                            <TableCell>{form.type}</TableCell>
                            <TableCell>
                              {form.isActive ? (
                                <Badge variant="default">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell>{form.rules?.length || 0}</TableCell>
                            <TableCell>
                              {form.hasActiveRules ? (
                                <Badge variant="default">
                                  {form.rules?.filter(r => r.active).length} Active
                                </Badge>
                              ) : (
                                <Badge variant="outline">None</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Link href={`/dashboard/forms/${form.id}/edit`}>
                                  <Button variant="outline" size="sm">
                                    Edit Form
                                  </Button>
                                </Link>
                                <Link href="/dashboard/emails/rules/new">
                                  <Button size="sm">
                                    Add Rule
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {emailRules.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Email Rules Details</CardTitle>
                    <CardDescription>
                      All configured email automation rules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 p-4 rounded-lg mb-4 flex items-start">
                      <Folder className="h-5 w-5 mr-3 mt-0.5 text-primary" />
                      <div>
                        <h3 className="font-medium mb-1">Folder Organization</h3>
                        <p className="text-sm text-muted-foreground">
                          You can organize your email rules into folders. Create a folder using the "New Folder" button, 
                          then assign rules to it using the dropdown in the "Folder" column. You can also move rules 
                          between folders at any time.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Select
                          value={selectedFolder || "all"}
                          onValueChange={(value) => setSelectedFolder(value === "all" ? null : value)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by folder" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Rules</SelectItem>
                            <SelectItem value="uncategorized">Uncategorized</SelectItem>
                            {folders.map((folder) => (
                              <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" onClick={() => setCreateFolderDialogOpen(true)}>
                          <FolderPlus className="h-4 w-4 mr-2" />
                          New Folder
                        </Button>
                        <Link href="/dashboard/emails/rules/new">
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Rule
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {groupedEmailRules.map(([folder, folderRules]) => (
                      <div key={folder || 'uncategorized'} className="mb-6">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-medium flex items-center">
                            <Folder className="h-4 w-4 mr-2" />
                            {folder || 'Uncategorized'}
                            <Badge className="ml-2" variant="outline">{folderRules.length}</Badge>
                            {folder && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-2"
                                onClick={() => {
                                  setFolderToRename(folder);
                                  setNewFolderNameInput(folder);
                                  setRenameFolderDialogOpen(true);
                                }}
                              >
                                Rename
                              </Button>
                            )}
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Rule Name</TableHead>
                                <TableHead>Form</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Conditions</TableHead>
                                <TableHead>Folder</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {folderRules.map(rule => {
                                const formName = forms.find(f => f.id === rule.formId)?.name || 'Unknown';
                                const conditionsObj = rule.conditions || [];
                                const conditionsCount = Array.isArray(conditionsObj) ? conditionsObj.length : 0;
                                
                                return (
                                  <TableRow key={rule.id}>
                                    <TableCell className="font-medium">{rule.name}</TableCell>
                                    <TableCell>{formName}</TableCell>
                                    <TableCell>{rule.template?.name || 'Unknown'}</TableCell>
                                    <TableCell>
                                      {rule.active ? (
                                        <Badge variant="default">Active</Badge>
                                      ) : (
                                        <Badge variant="secondary">Inactive</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {conditionsCount > 0 ? (
                                        <Badge variant="outline">
                                          <Filter className="h-3 w-3 mr-1" />
                                          {conditionsCount} {conditionsCount === 1 ? 'condition' : 'conditions'}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline">No conditions</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center">
                                        <Select
                                          value={rule.folder || "uncategorized"}
                                          onValueChange={async (value) => {
                                            try {
                                              const response = await fetch(`/api/emails/rules/${rule.id}`, {
                                                method: 'PUT',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                },
                                                body: JSON.stringify({
                                                  folder: value === "uncategorized" ? null : value,
                                                }),
                                              });
                                              
                                              if (!response.ok) {
                                                throw new Error('Failed to update rule folder');
                                              }
                                              
                                              // Refresh rules after updating
                                              fetchData();
                                              
                                              toast({
                                                title: "Folder Updated",
                                                description: `Rule moved to ${value === "uncategorized" ? "Uncategorized" : value}`,
                                              });
                                            } catch (err) {
                                              console.error('Error updating rule folder:', err);
                                              toast({
                                                title: "Error",
                                                description: "Failed to update rule folder",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                        >
                                          <SelectTrigger className="w-[140px] h-8 border-dashed border-primary/50 hover:border-primary transition-colors">
                                            <SelectValue placeholder="Select folder" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="uncategorized">Uncategorized</SelectItem>
                                            {folders.map((f) => (
                                              <SelectItem key={f} value={f}>{f}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-2">
                                        <Link href={`/dashboard/emails/rules/${rule.id}`}>
                                          <Button variant="outline" size="sm">
                                            Edit Rule
                                          </Button>
                                        </Link>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                          onClick={async () => {
                                            if (confirm(`Are you sure you want to delete the rule "${rule.name}"? This action cannot be undone.`)) {
                                              try {
                                                const response = await fetch(`/api/emails/rules/${rule.id}`, {
                                                  method: 'DELETE',
                                                });
                                                
                                                if (!response.ok) {
                                                  throw new Error('Failed to delete rule');
                                                }
                                                
                                                // Refresh rules after deleting
                                                fetchData();
                                                
                                                toast({
                                                  title: "Rule Deleted",
                                                  description: `Rule "${rule.name}" has been deleted`,
                                                });
                                              } catch (err) {
                                                console.error('Error deleting rule:', err);
                                                toast({
                                                  title: "Error",
                                                  description: "Failed to delete rule",
                                                  variant: "destructive",
                                                });
                                              }
                                            }
                                          }}
                                        >
                                          Delete
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="submissions">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Form Submissions</CardTitle>
                  <CardDescription>
                    Recent form submissions and their email status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Form</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Email Status</TableHead>
                        <TableHead>Emails Sent</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissionsWithLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No form submissions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        submissionsWithLogs.map(submission => {
                          const formName = forms.find(f => f.id === submission.formId)?.name || 'Unknown';
                          const formType = forms.find(f => f.id === submission.formId)?.type || 'Unknown';
                          
                          return (
                            <TableRow key={submission.id}>
                              <TableCell>
                                {new Date(submission.createdAt).toLocaleDateString()} {new Date(submission.createdAt).toLocaleTimeString()}
                              </TableCell>
                              <TableCell className="font-medium">{formName}</TableCell>
                              <TableCell>{formType}</TableCell>
                              <TableCell>
                                {submission.hasEmailsSent ? (
                                  <Badge variant="default">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Email Sent
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">No Emails</Badge>
                                )}
                              </TableCell>
                              <TableCell>{submission.emailLogs?.length || 0}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {submission.leadId && (
                                    <Link href={`/dashboard/leads?id=${submission.leadId}`}>
                                      <Button variant="outline" size="sm">
                                        View Lead
                                      </Button>
                                    </Link>
                                  )}
                                  {submission.bookingId && (
                                    <Link href={`/dashboard/bookings?id=${submission.bookingId}`}>
                                      <Button variant="outline" size="sm">
                                        View Booking
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle>Email Logs</CardTitle>
                  <CardDescription>
                    Recent emails sent by automations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No email logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        emailLogs.map(log => {
                          const submission = formSubmissions.find(s => s.id === log.formSubmissionId);
                          const formName = submission ? forms.find(f => f.id === submission.formId)?.name : null;
                          
                          return (
                            <TableRow key={log.id}>
                              <TableCell>
                                {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                              </TableCell>
                              <TableCell className="font-medium">{log.template?.name || 'Unknown'}</TableCell>
                              <TableCell>{log.recipient}</TableCell>
                              <TableCell>{log.subject}</TableCell>
                              <TableCell>
                                {log.status === 'sent' ? (
                                  <Badge variant="default">Sent</Badge>
                                ) : log.status === 'test' ? (
                                  <Badge variant="outline">Test</Badge>
                                ) : (
                                  <Badge variant="destructive">Failed</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {log.formSubmissionId ? (
                                  <div className="flex items-center">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {formName || 'Form Submission'}
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <LucideMail className="h-3 w-3 mr-1" />
                                    Manual
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your email rules
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                placeholder="Enter folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground space-y-2 border-t pt-4 mt-4">
              <p className="font-medium">How to use folders:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Create a folder with a descriptive name</li>
                <li>Assign rules to this folder using the dropdown in the rules list</li>
                <li>You can move rules between folders at any time</li>
              </ol>
              <p className="mt-2 italic">Note: Folders are created in the database when you assign a rule to them.</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!newFolderName.trim()) {
                  toast({
                    title: "Error",
                    description: "Folder name cannot be empty",
                    variant: "destructive",
                  });
                  return;
                }
                
                // Create a rule with the new folder to add it to the database
                // This will trigger a refresh of the rules list
                fetch('/api/emails/rules', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: `Rule in ${newFolderName}`,
                    templateId: emailRules.length > 0 ? emailRules[0].templateId : null,
                    formId: emailRules.length > 0 ? emailRules[0].formId : null,
                    conditions: [],
                    folder: newFolderName.trim(),
                  }),
                })
                .then(response => {
                  if (!response.ok) {
                    throw new Error('Failed to create rule with new folder');
                  }
                  return response.json();
                })
                .then(() => {
                  // Refresh rules to update folders list
                  fetchData();
                })
                .catch(err => {
                  console.error('Error creating rule with new folder:', err);
                  toast({
                    title: "Error",
                    description: "Failed to create folder",
                    variant: "destructive",
                  });
                });
                
                // Close dialog and reset input
                setCreateFolderDialogOpen(false);
                
                toast({
                  title: "Folder Created",
                  description: `Folder "${newFolderName}" has been created. You can now assign rules to it using the dropdown in the "Folder" column.`,
                });
                
                setNewFolderName('');
              }}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameFolderDialogOpen} onOpenChange={setRenameFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Rename the folder "{folderToRename}" and update all rules within it
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newFolderName">New Folder Name</Label>
              <Input
                id="newFolderName"
                placeholder="Enter new folder name"
                value={newFolderNameInput}
                onChange={(e) => setNewFolderNameInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!newFolderNameInput.trim()) {
                  toast({
                    title: "Error",
                    description: "Folder name cannot be empty",
                    variant: "destructive",
                  });
                  return;
                }
                
                if (folderToRename) {
                  handleRenameFolder(folderToRename, newFolderNameInput.trim());
                }
              }}
            >
              Rename Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
