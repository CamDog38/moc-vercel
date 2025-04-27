import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { FileDown } from 'lucide-react';

interface PdfTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'INVOICE' | 'BOOKING' | 'CERTIFICATE';
  htmlContent: string;
  cssContent?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PdfTemplateListProps {
  templates: PdfTemplate[];
  onEdit: (template: PdfTemplate) => void;
  onDelete: (id: string) => Promise<void>;
  onCreateNew: () => void;
  activeFilter?: string | null;
}

const PdfTemplateList: React.FC<PdfTemplateListProps> = ({ 
  templates, 
  onEdit, 
  onDelete,
  onCreateNew,
  activeFilter
}) => {
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      await onDelete(templateToDelete);
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    } finally {
      setTemplateToDelete(null);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INVOICE':
        return <Badge variant="outline" className="bg-blue-50">Invoice</Badge>;
      case 'BOOKING':
        return <Badge variant="outline" className="bg-green-50">Booking</Badge>;
      case 'CERTIFICATE':
        return <Badge variant="outline" className="bg-purple-50">Certificate</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>PDF Templates</CardTitle>
          <CardDescription>
            Manage your PDF templates for invoices, bookings, and certificates
          </CardDescription>
        </div>
        <Button onClick={onCreateNew}>Create Template</Button>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No templates found</p>
            <Button onClick={onCreateNew}>Create your first template</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{getTypeLabel(template.type)}</TableCell>
                  <TableCell>
                    {template.isActive ? (
                      <Badge variant="outline" className="bg-green-50">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>{new Date(template.updatedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onEdit(template)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`/api/pdf-templates/convert?templateId=${template.id}`, '_blank')}
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => setTemplateToDelete(template.id)}
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the
                              template "{template.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PdfTemplateList;