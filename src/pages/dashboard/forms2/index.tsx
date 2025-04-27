/**
 * Form System 2.0 Dashboard - Forms List
 * 
 * This page displays a list of forms created with the Form System 2.0
 * and provides options to create, edit, and manage forms.
 */

import { useState, useEffect } from 'react';
import { useRouter } from "next/router";
import { ShareForm2Dialog } from "@/components/forms2/ShareForm2Dialog";
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Eye, Trash, Copy } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Form2Model } from '@/lib/forms2/core/types';

export default function Forms2DashboardPage() {
  return (
    <DashboardLayout>
      <Forms2Dashboard />
      <Toaster />
    </DashboardLayout>
  );
}

function Forms2Dashboard() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [forms, setForms] = useState<Form2Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [processingFormIds, setProcessingFormIds] = useState<Record<string, {action: 'delete' | 'duplicate', jobId?: string}>>({});

  // Helper function to extract isPublic from form fields
  const getFormIsPublic = (form: Form2Model): boolean => {
    try {
      if (form.fields) {
        const fieldsObj = typeof form.fields === 'string' 
          ? JSON.parse(form.fields) 
          : form.fields;
        return fieldsObj.isPublic === true;
      }
    } catch (error) {
      console.error('Error parsing form fields:', error);
    }
    return false;
  };

  // Fetch forms when the component mounts
  useEffect(() => {
    if (!initializing && user) {
      fetchForms();
    }
  }, [initializing, user]);

  // Fetch forms from the API
  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/forms2');
      setForms(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching forms:', err);
      setError('Failed to load forms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create a test form
  const createTestForm = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/forms2/create-test');
      await fetchForms();
      setSuccessMessage(`Test form "${response.data.form.title}" created successfully!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error creating test form:', err);
      setError('Failed to create test form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete a form
  const deleteForm = async (id: string) => {
    // Check if this form is already being processed
    if (isDeleting || processingFormIds[id]) return;
    
    if (window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      // Mark this form as being deleted
      setProcessingFormIds(prev => ({
        ...prev,
        [id]: { action: 'delete' }
      }));
      
      setIsDeleting(true);
      try {
        // First try the async version
        const response = await fetch(`/api/forms2/${id}/delete-async`, {
          method: "POST",
        });

        if (!response.ok) {
          // If async version fails, fall back to the original endpoint
          const fallbackResponse = await fetch(`/api/forms2/${id}`, {
            method: "DELETE",
          });
          
          if (!fallbackResponse.ok) {
            const fallbackErrorData = await fallbackResponse.json();
            throw new Error(fallbackErrorData.error || "Failed to delete form");
          }
          
          setSuccessMessage('Form deleted successfully!');
          
          // Remove from processing state
          setProcessingFormIds(prev => {
            const newState = {...prev};
            delete newState[id];
            return newState;
          });
          
          // Refresh the forms list
          await fetchForms();
          return;
        }

        const result = await response.json();
        
        setSuccessMessage('Form deletion started. It will be removed shortly.');

        // Update processing state with job ID
        setProcessingFormIds(prev => ({
          ...prev,
          [id]: { action: 'delete', jobId: result.jobId }
        }));

        // Poll for job completion
        pollDeletionStatus(id, result.jobId);
      } catch (error: any) {
        console.error('Error deleting form:', error);
        
        // Check for specific error about associated bookings
        const errorMessage = error.message || 'Failed to delete form. Please try again.';
        const isBookingError = errorMessage.includes('bookings');
        
        // Set the error message for the Alert component
        setError(errorMessage);
        
        // Display a more user-friendly error message for booking constraint errors
        const displayMessage = isBookingError 
          ? 'Cannot delete this form because it has associated bookings. Please delete the bookings first before deleting the form.'
          : errorMessage;
        
        // Show a toast notification for better visibility
        toast({
          title: isBookingError ? "Cannot Delete Form" : "Error",
          description: displayMessage,
          variant: "destructive"
        });
        
        // Remove from processing state on error
        setProcessingFormIds(prev => {
          const newState = {...prev};
          delete newState[id];
          return newState;
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  // Helper function to poll for deletion job status
  const pollDeletionStatus = (formId: string, jobId: string) => {
    const checkJobStatus = async () => {
      try {
        const statusResponse = await fetch(`/api/forms2/${formId}/delete-async?jobId=${jobId}`);
        if (statusResponse.ok) {
          const jobStatus = await statusResponse.json();
          
          if (jobStatus.status === 'completed') {
            setSuccessMessage('Form deleted successfully!');
            
            // Remove from processing state
            setProcessingFormIds(prev => {
              const newState = {...prev};
              delete newState[formId];
              return newState;
            });
            
            // Refresh the forms list immediately after successful deletion
            await fetchForms();
            return;
          } else if (jobStatus.status === 'failed') {
            // Remove from processing state on failure
            setProcessingFormIds(prev => {
              const newState = {...prev};
              delete newState[formId];
              return newState;
            });
            
            throw new Error(jobStatus.error || "Failed to delete form");
          } else {
            // Still processing, check again in 2 seconds
            setTimeout(checkJobStatus, 2000);
          }
        } else {
          // If status check fails, remove from processing state and refresh the forms list
          setProcessingFormIds(prev => {
            const newState = {...prev};
            delete newState[formId];
            return newState;
          });
          
          setTimeout(() => fetchForms(), 5000);
        }
      } catch (error) {
        // If polling fails, remove from processing state and refresh the forms list
        setProcessingFormIds(prev => {
          const newState = {...prev};
          delete newState[formId];
          return newState;
        });
        
        setTimeout(() => fetchForms(), 5000);
      }
    };
    
    // Start polling after a short delay
    setTimeout(checkJobStatus, 2000);
  };
  
  // Duplicate a form
  const duplicateForm = async (id: string) => {
    // Check if this form is already being processed
    if (isDuplicating || processingFormIds[id]) return;
    
    // Mark this form as being duplicated
    setProcessingFormIds(prev => ({
      ...prev,
      [id]: { action: 'duplicate' }
    }));
    
    setIsDuplicating(true);
    try {
      // First try the async version
      const response = await fetch(`/api/forms2/${id}/duplicate-async`, {
        method: "POST",
      });

      if (!response.ok) {
        // If async version fails, fall back to the original endpoint
        const fallbackResponse = await fetch(`/api/forms2/${id}/duplicate`, {
          method: "POST",
        });
        
        if (!fallbackResponse.ok) {
          const errorData = await fallbackResponse.json();
          throw new Error(errorData.error || "Failed to duplicate form");
        }
        
        setSuccessMessage('Form duplicated successfully!');
        
        // Remove from processing state
        setProcessingFormIds(prev => {
          const newState = {...prev};
          delete newState[id];
          return newState;
        });
        
        // Refresh the forms list immediately
        await fetchForms();
        return;
      }

      const result = await response.json();
      
      setSuccessMessage('Form duplication started. It will appear in the list shortly.');

      // Update processing state with job ID
      setProcessingFormIds(prev => ({
        ...prev,
        [id]: { action: 'duplicate', jobId: result.jobId }
      }));

      // Poll for job completion
      pollDuplicationStatus(id, result.jobId);
    } catch (error: any) {
      console.error('Error duplicating form:', error);
      setError(error.message || 'Failed to duplicate form. Please try again.');
      
      // Remove from processing state on error
      setProcessingFormIds(prev => {
        const newState = {...prev};
        delete newState[id];
        return newState;
      });
    } finally {
      setIsDuplicating(false);
    }
  };
  
  // Helper function to poll for duplication job status
  const pollDuplicationStatus = (formId: string, jobId: string) => {
    const checkJobStatus = async () => {
      try {
        const statusResponse = await fetch(`/api/forms2/${formId}/duplicate-async?jobId=${jobId}`);
        if (statusResponse.ok) {
          const jobStatus = await statusResponse.json();
          
          if (jobStatus.status === 'completed') {
            setSuccessMessage('Form duplicated successfully!');
            
            // Remove from processing state
            setProcessingFormIds(prev => {
              const newState = {...prev};
              delete newState[formId];
              return newState;
            });
            
            // Refresh the forms list immediately after successful duplication
            await fetchForms();
            return;
          } else if (jobStatus.status === 'failed') {
            // Remove from processing state on failure
            setProcessingFormIds(prev => {
              const newState = {...prev};
              delete newState[formId];
              return newState;
            });
            
            throw new Error(jobStatus.error || "Failed to duplicate form");
          } else {
            // Still processing, check again in 2 seconds
            setTimeout(checkJobStatus, 2000);
          }
        } else {
          // If status check fails, remove from processing state and refresh the forms list
          setProcessingFormIds(prev => {
            const newState = {...prev};
            delete newState[formId];
            return newState;
          });
          
          setTimeout(() => fetchForms(), 5000);
        }
      } catch (error) {
        // If polling fails, remove from processing state and refresh the forms list
        setProcessingFormIds(prev => {
          const newState = {...prev};
          delete newState[formId];
          return newState;
        });
        
        setTimeout(() => fetchForms(), 5000);
      }
    };
    
    // Start polling after a short delay
    setTimeout(checkJobStatus, 2000);
  };

  // Function to render status badge
  const renderStatusBadge = (isActive: boolean) => (
    <Badge 
      variant={isActive ? "default" : "secondary"}
      className={isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
    >
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );

  // Function to render visibility badge
  const renderVisibilityBadge = (isPublic: boolean) => (
    <Badge 
      variant={isPublic ? "default" : "outline"}
    >
      {isPublic ? 'Public' : 'Private'}
    </Badge>
  );

  // Function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Function to render action buttons
  const renderActionButtons = (id: string) => {
    const isProcessing = processingFormIds[id] !== undefined;
    const processingAction = isProcessing ? processingFormIds[id].action : null;
    
    return (
      <div className="flex gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.push(`/dashboard/forms2/${id}`)}
          title="Edit Form"
          disabled={isProcessing}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.push(`/dashboard/forms2/${id}/preview`)}
          title="Preview Form"
          disabled={isProcessing}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => duplicateForm(id)}
          title="Duplicate Form"
          disabled={isProcessing}
        >
          {processingAction === 'duplicate' ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <ShareForm2Dialog formId={id} />
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => deleteForm(id)}
          title="Delete Form"
          className="text-destructive hover:text-destructive"
          disabled={isProcessing}
        >
          {processingAction === 'delete' ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <Trash className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  };

  // If the user is not authenticated, redirect to the login page
  if (!user && !initializing) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="grid gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Forms</h1>
          <Button 
            onClick={() => router.push('/dashboard/forms2/create')}
            className="gap-1"
          >
            <Plus className="h-4 w-4" /> Create Form
          </Button>
        </div>
        <Button 
          variant="outline" 
          onClick={createTestForm}
          className="w-fit"
        >
          Create Test Form
        </Button>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
            {successMessage}
          </Alert>
        )}
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Title</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Visibility</TableHead>
                <TableHead className="text-center">Created</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : forms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No forms found. Create your first form!</TableCell>
                </TableRow>
              ) : (
                forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="text-center">{form.name}</TableCell>
                    <TableCell className="text-center">{form.type}</TableCell>
                    <TableCell className="text-center">{renderStatusBadge(form.isActive)}</TableCell>
                    <TableCell className="text-center">{renderVisibilityBadge(getFormIsPublic(form))}</TableCell>
                    <TableCell className="text-center">{formatDate(form.createdAt.toString())}</TableCell>
                    <TableCell className="text-center">{renderActionButtons(form.id)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Form System 2.0 - Modern form builder with advanced features
        </div>
      </div>
    </div>
  );
}
