import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Mail, FileText, AlertTriangle, CheckCircle, Clock, Bug, Folder, FolderPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import the Automations page with props type
const FormAutomations = dynamic<{formSystem2?: boolean}>(() => import('../forms/automations'), { ssr: false });

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  type: string;
  description: string;
  folder?: string | null;
  createdAt: string;
};

type EmailRule = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  template: {
    id: string;
    name: string;
  };
  createdAt: string;
};

type EmailLog = {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  createdAt: string;
  template: {
    id: string;
    name: string;
    type: string;
  };
  booking?: {
    id: string;
    name: string;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
  };
};

export default function EmailsPage() {
  const router = useRouter();
  const { tab } = router.query;
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [renameFolderDialogOpen, setRenameFolderDialogOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<string | null>(null);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  // Form system toggle state
  const [useFormSystem2, setUseFormSystem2] = useState(false);
  const [loading, setLoading] = useState({
    templates: true,
    rules: true,
    logs: true,
  });
  const [error, setError] = useState({
    templates: null as string | null,
    rules: null as string | null,
    logs: null as string | null,
  });
  
  // Extract unique folders from templates
  const folders = useMemo(() => {
    const folderSet = new Set<string>();
    templates.forEach(template => {
      if (template.folder) {
        folderSet.add(template.folder);
      }
    });
    return Array.from(folderSet).sort();
  }, [templates]);
  
  // Group templates by folder
  const groupedTemplates = useMemo(() => {
    // If a folder is selected, only show templates from that folder
    const filteredTemplates = selectedFolder !== null
      ? templates.filter(t => selectedFolder === "uncategorized" ? !t.folder : t.folder === selectedFolder)
      : templates;
    
    // Group templates by folder
    const groups = new Map<string, EmailTemplate[]>();
    
    filteredTemplates.forEach(template => {
      const folder = template.folder || '';
      if (!groups.has(folder)) {
        groups.set(folder, []);
      }
      groups.get(folder)!.push(template);
    });
    
    // Convert to array of [folder, templates] pairs and sort by folder name
    return Array.from(groups.entries()).sort((a, b) => {
      // Put "uncategorized" (empty string) at the end
      if (a[0] === '' && b[0] !== '') return 1;
      if (a[0] !== '' && b[0] === '') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [templates, selectedFolder]);

  useEffect(() => {
    fetchTemplates();
    fetchRules();
    fetchLogs();
    
    // Set active tab based on URL query parameter
    if (tab === 'rules' || tab === 'templates' || tab === 'logs') {
      setActiveTab(tab as string);
    }
  }, [tab]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/emails');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data);
    } catch (err: unknown) {
      console.error('Error fetching templates:', err);
      setError({
        ...error,
        templates: err instanceof Error ? err.message : 'Failed to load email templates'
      });
    } finally {
      setLoading((prev) => ({ ...prev, templates: false }));
    }
  };

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/emails/rules');
      if (!response.ok) {
        throw new Error('Failed to fetch rules');
      }
      const data = await response.json();
      setRules(data);
    } catch (err: unknown) {
      console.error('Error fetching rules:', err);
      setError({
        ...error,
        rules: err instanceof Error ? err.message : 'Failed to load email rules'
      });
    } finally {
      setLoading((prev) => ({ ...prev, rules: false }));
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/emails/logs');
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const data = await response.json();
      setLogs(data);
    } catch (err: unknown) {
      console.error('Error fetching logs:', err);
      setError({
        ...error,
        logs: err instanceof Error ? err.message : 'Failed to load email logs'
      });
      setLogs([]);
    } finally {
      setLoading((prev) => ({ ...prev, logs: false }));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getTemplateTypeBadge = (type: string) => {
    switch (type.toUpperCase()) {
      case 'INQUIRY':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Inquiry</Badge>;
      case 'BOOKING':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Booking</Badge>;
      case 'INVOICE':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Invoice</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return (
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">Sent</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-red-600">Failed</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-amber-500 mr-1" />
            <span className="text-amber-600">Pending</span>
          </div>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const handleRenameFolder = async (oldFolder: string, newFolder: string) => {
    try {
      // Update all templates in the old folder to use the new folder name
      const templatesToUpdate = templates.filter(t => t.folder === oldFolder);
      
      // Update each template
      await Promise.all(templatesToUpdate.map(template =>
        fetch(`/api/emails/${template.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            folder: newFolder,
          }),
        })
      ));

      // Refresh templates to update the UI
      fetchTemplates();
      
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
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Email Management</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/emails/rule-mappings')}>
            <Mail className="h-4 w-4 mr-2" />
            Rule Mappings
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/emails/debug')}>
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/emails/monitor')}>
            <Clock className="h-4 w-4 mr-2" />
            Monitor
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/emails/troubleshoot')}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Troubleshoot
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Email Management</CardTitle>
            <CardDescription>
              Manage your email templates, rules, and view email logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => {
                setActiveTab(value);
                router.push({
                  pathname: router.pathname,
                  query: { ...router.query, tab: value }
                }, undefined, { shallow: true });
              }}>
              <TabsList className="mb-4">
                <TabsTrigger value="templates" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="rules" className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Rules
                </TabsTrigger>
                <TabsTrigger value="logs" className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="templates">
                <div className="bg-muted/50 p-4 rounded-lg mb-4 flex items-start">
                  <Folder className="h-5 w-5 mr-3 mt-0.5 text-primary" />
                  <div>
                    <h3 className="font-medium mb-1">Folder Organization</h3>
                    <p className="text-sm text-muted-foreground">
                      You can organize your templates into folders. Create a folder using the "New Folder" button, 
                      then assign templates to it using the dropdown in the "Folder" column. You can also move templates 
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
                        <SelectItem value="all">All Templates</SelectItem>
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
                    <Button onClick={() => router.push('/dashboard/emails/templates/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Template
                    </Button>
                  </div>
                </div>

                {loading.templates ? (
                  <p>Loading templates...</p>
                ) : error.templates ? (
                  <p className="text-red-500">{error.templates}</p>
                ) : templates.length === 0 ? (
                  <p>No email templates found.</p>
                ) : (
                  <div>
                    {/* Group templates by folder */}
                    {groupedTemplates.map(([folder, folderTemplates]) => (
                      <div key={folder || 'uncategorized'} className="mb-6">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-medium flex items-center">
                            <Folder className="h-4 w-4 mr-2" />
                            {folder || 'Uncategorized'}
                            <Badge className="ml-2" variant="outline">{folderTemplates.length}</Badge>
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
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="py-2 px-4 text-left font-medium">Name</th>
                                <th className="py-2 px-4 text-left font-medium">Subject</th>
                                <th className="py-2 px-4 text-left font-medium">Type</th>
                                <th className="py-2 px-4 text-left font-medium">Created</th>
                                <th className="py-2 px-4 text-left font-medium">Folder</th>
                                <th className="py-2 px-4 text-left font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {folderTemplates.map((template) => (
                                <tr key={template.id} className="border-b hover:bg-muted/50">
                                  <td className="py-2 px-4">{template.name}</td>
                                  <td className="py-2 px-4">{template.subject}</td>
                                  <td className="py-2 px-4">
                                    {getTemplateTypeBadge(template.type)}
                                  </td>
                                  <td className="py-2 px-4 text-sm">
                                    {formatDate(template.createdAt)}
                                  </td>
                                  <td className="py-2 px-4">
                                    <div className="flex items-center">
                                      <Select
                                        value={template.folder || "uncategorized"}
                                        onValueChange={async (value) => {
                                          try {
                                            const response = await fetch(`/api/emails/${template.id}`, {
                                              method: 'PUT',
                                              headers: {
                                                'Content-Type': 'application/json',
                                              },
                                              body: JSON.stringify({
                                                folder: value === "uncategorized" ? null : value,
                                              }),
                                            });
                                            
                                            if (!response.ok) {
                                              throw new Error('Failed to update template folder');
                                            }
                                            
                                            // Refresh templates after updating
                                            fetchTemplates();
                                            
                                            toast({
                                              title: "Folder Updated",
                                              description: `Template moved to ${value === "uncategorized" ? "Uncategorized" : value}`,
                                            });
                                          } catch (err) {
                                            console.error('Error updating template folder:', err);
                                            toast({
                                              title: "Error",
                                              description: "Failed to update template folder",
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
                                      <span className="ml-2 text-xs text-muted-foreground">← Click to change</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-4">
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => router.push(`/dashboard/emails/templates/${template.id}`)}
                                      >
                                        Edit
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={async () => {
                                          if (confirm(`Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`)) {
                                            try {
                                              const response = await fetch(`/api/emails/${template.id}`, {
                                                method: 'DELETE',
                                              });
                                              
                                              if (!response.ok) {
                                                throw new Error('Failed to delete template');
                                              }
                                              
                                              // Refresh templates after deleting
                                              fetchTemplates();
                                              
                                              toast({
                                                title: "Template Deleted",
                                                description: `Template "${template.name}" has been deleted`,
                                              });
                                            } catch (err) {
                                              console.error('Error deleting template:', err);
                                              toast({
                                                title: "Error",
                                                description: "Failed to delete template",
                                                variant: "destructive",
                                              });
                                            }
                                          }
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rules">
                {tab === 'rules' ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="form-system-toggle" className="text-sm font-normal">
                          {useFormSystem2 ? 'Using Form System 2.0' : 'Using Legacy Forms'}
                        </Label>
                        <Switch
                          id="form-system-toggle"
                          checked={useFormSystem2}
                          onCheckedChange={setUseFormSystem2}
                        />
                      </div>
                    </div>
                    <FormAutomations formSystem2={useFormSystem2} />
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="form-system-toggle" className="text-sm font-normal">
                          {useFormSystem2 ? 'Using Form System 2.0' : 'Using Legacy Forms'}
                        </Label>
                        <Switch
                          id="form-system-toggle"
                          checked={useFormSystem2}
                          onCheckedChange={setUseFormSystem2}
                        />
                      </div>
                      <Button onClick={() => router.push('/dashboard/emails/rules/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Rule
                      </Button>
                    </div>

                    {loading.rules ? (
                      <p>Loading rules...</p>
                    ) : error.rules ? (
                      <p className="text-red-500">{error.rules}</p>
                    ) : rules.length === 0 ? (
                      <p>No email rules found.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="py-2 px-4 text-left font-medium">Name</th>
                              <th className="py-2 px-4 text-left font-medium">Description</th>
                              <th className="py-2 px-4 text-left font-medium">Template</th>
                              <th className="py-2 px-4 text-left font-medium">Status</th>
                              <th className="py-2 px-4 text-left font-medium">Created</th>
                              <th className="py-2 px-4 text-left font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rules.map((rule) => (
                              <tr key={rule.id} className="border-b hover:bg-muted/50">
                                <td className="py-2 px-4">{rule.name}</td>
                                <td className="py-2 px-4">{rule.description}</td>
                                <td className="py-2 px-4">{rule.template.name}</td>
                                <td className="py-2 px-4">
                                  {rule.active ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                      Inactive
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-2 px-4 text-sm">
                                  {formatDate(rule.createdAt)}
                                </td>
                                <td className="py-2 px-4">
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => router.push(`/dashboard/emails/rules/${rule.id}`)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => router.push(`/dashboard/emails/rule-mappings?ruleId=${rule.id}`)}
                                    >
                                      View Mappings
                                    </Button>
                                    <Button 
                                      variant="ghost" 
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
                                            fetchRules();
                                            
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
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="logs">
                {loading.logs ? (
                  <p>Loading logs...</p>
                ) : error.logs ? (
                  <p className="text-red-500">{error.logs}</p>
                ) : !logs || logs.length === 0 ? (
                  <p>No email logs found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 px-4 text-left font-medium">Date</th>
                          <th className="py-2 px-4 text-left font-medium">Recipient</th>
                          <th className="py-2 px-4 text-left font-medium">Subject</th>
                          <th className="py-2 px-4 text-left font-medium">Template</th>
                          <th className="py-2 px-4 text-left font-medium">Related To</th>
                          <th className="py-2 px-4 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(logs) && logs.map((log) => (
                          <tr key={log.id} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-4 text-sm">
                              {formatDate(log.createdAt)}
                            </td>
                            <td className="py-2 px-4 text-sm">{log.recipient}</td>
                            <td className="py-2 px-4 text-sm">{log.subject}</td>
                            <td className="py-2 px-4 text-sm">
                              {log.template.name}
                              <div className="mt-1">
                                {getTemplateTypeBadge(log.template.type)}
                              </div>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              {log.booking ? (
                                <Link href={`/dashboard/bookings/${log.booking.id}`} className="text-primary hover:underline">
                                  Booking: {log.booking.name}
                                </Link>
                              ) : log.invoice ? (
                                <Link href={`/dashboard/invoices/${log.invoice.id}`} className="text-primary hover:underline">
                                  Invoice: {log.invoice.invoiceNumber || log.invoice.id}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-sm">
                              {getStatusBadge(log.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your email templates
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
                <li>Assign templates to this folder using the dropdown in the templates list</li>
                <li>You can also assign templates to folders when creating or editing a template</li>
              </ol>
              <p className="mt-2 italic">Note: Folders are created in the database when you assign a template to them.</p>
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
                
                // Create a template with the new folder to add it to the database
                // This will trigger a refresh of the templates list
                fetch('/api/emails', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: `Template in ${newFolderName}`,
                    subject: 'New Template',
                    type: 'INQUIRY',
                    htmlContent: '<p>Template content</p>',
                    folder: newFolderName.trim(),
                  }),
                })
                .then(response => {
                  if (!response.ok) {
                    throw new Error('Failed to create template with new folder');
                  }
                  return response.json();
                })
                .then(() => {
                  // Refresh templates to update folders list
                  fetchTemplates();
                })
                .catch(err => {
                  console.error('Error creating template with new folder:', err);
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
                  description: `Folder "${newFolderName}" has been created. You can now assign templates to it using the dropdown in the "Folder" column.`,
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
              Rename the folder "{folderToRename}" and update all templates within it
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
    </div>
  );
}
