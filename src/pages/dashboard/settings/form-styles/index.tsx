import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlusCircle, Pencil, Trash2, Copy, Globe } from 'lucide-react';

interface FormStyle {
  id: string;
  name: string;
  description?: string;
  isGlobal: boolean;
  formId?: string;
  createdAt: string;
  updatedAt: string;
  form?: {
    id: string;
    name: string;
  };
}

export default function FormStylesPage() {
  const router = useRouter();
  const [formStyles, setFormStyles] = useState<FormStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchFormStyles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/form-styles');
      if (!response.ok) {
        throw new Error('Failed to fetch form styles');
      }
      const data = await response.json();
      setFormStyles(data);
    } catch (error) {
      console.error('Error fetching form styles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form styles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormStyles();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      setDeleting(id);
      const response = await fetch(`/api/form-styles/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete form style');
      }

      toast({
        title: 'Success',
        description: 'Form style deleted successfully',
      });

      // Refresh the list
      fetchFormStyles();
    } catch (error) {
      console.error('Error deleting form style:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete form style',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleDuplicate = async (style: FormStyle) => {
    try {
      const response = await fetch('/api/form-styles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${style.name} (Copy)`,
          description: style.description,
          cssContent: style.cssContent,
          isGlobal: style.isGlobal,
          formId: style.formId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to duplicate form style');
      }

      toast({
        title: 'Success',
        description: 'Form style duplicated successfully',
      });

      // Refresh the list
      fetchFormStyles();
    } catch (error) {
      console.error('Error duplicating form style:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to duplicate form style',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Form Styles</CardTitle>
            <CardDescription>Manage custom CSS styles for your forms</CardDescription>
          </div>
          <Button onClick={() => router.push('/dashboard/settings/form-styles/new')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Style
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : formStyles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No form styles found</p>
              <Button onClick={() => router.push('/dashboard/settings/form-styles/new')}>
                Create Your First Style
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Applied To</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formStyles.map((style) => (
                  <TableRow key={style.id}>
                    <TableCell className="font-medium">{style.name}</TableCell>
                    <TableCell>{style.description || '-'}</TableCell>
                    <TableCell>
                      {style.isGlobal ? (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <Globe className="h-3 w-3" />
                          Global
                        </Badge>
                      ) : style.form ? (
                        style.form.name
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{new Date(style.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/dashboard/settings/form-styles/${style.id}/edit`)}
                        title="Edit Style"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(style)}
                        title="Duplicate Style"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            title="Delete Style"
                            disabled={deleting === style.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Form Style</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this form style? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(style.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deleting === style.id}
                            >
                              {deleting === style.id ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}