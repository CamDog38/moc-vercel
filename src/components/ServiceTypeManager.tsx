import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Plus, Trash } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DEFAULT_SERVICE_TYPES } from '@/util/service-types';

// Format service type code to display name
const formatServiceType = (serviceType: string): string => {
  if (!serviceType) return '';
  
  // Check if it's a known service type with a display name
  if (DEFAULT_SERVICE_TYPES[serviceType as keyof typeof DEFAULT_SERVICE_TYPES]) {
    return DEFAULT_SERVICE_TYPES[serviceType as keyof typeof DEFAULT_SERVICE_TYPES];
  } 
  
  // Otherwise, format it nicely
  return serviceType
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

interface ServiceType {
  serviceType: string;
  displayName: string;
}

export function ServiceTypeManager() {
  const { toast } = useToast();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingServiceType, setEditingServiceType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    serviceType: "",
    displayName: "",
  });

  const fetchServiceTypes = async () => {
    try {
      const response = await fetch('/api/service-types');
      if (response.ok) {
        const data = await response.json();
        
        // Map the raw service types to include display names
        const formattedTypes = data.map((type: any) => {
          return {
            serviceType: type.serviceType,
            displayName: formatServiceType(type.serviceType)
          };
        });
        
        setServiceTypes(formattedTypes);
      } else {
        throw new Error('Failed to fetch service types');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch service types",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const url = '/api/service-types';
      const method = 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Service type saved successfully",
        });
        
        // Add the new service type to the list without refreshing
        if (!editingServiceType) {
          setServiceTypes([...serviceTypes, {
            serviceType: form.serviceType,
            displayName: form.displayName
          }]);
        } else {
          // Update the edited service type
          const updatedTypes = serviceTypes.map(type => 
            type.serviceType === editingServiceType 
              ? { serviceType: form.serviceType, displayName: form.displayName }
              : type
          );
          setServiceTypes(updatedTypes);
        }
        
        // Close dialog and reset form
        setShowDialog(false);
        setForm({
          serviceType: "",
          displayName: "",
        });
        setEditingServiceType(null);
      } else {
        throw new Error(data.error || 'Failed to save service type');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save service type",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (serviceType: string) => {
    if (confirm("Are you sure you want to delete this service type? This action cannot be undone.")) {
      try {
        const response = await fetch('/api/service-types', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ serviceType }),
        });
        
        if (response.ok) {
          toast({
            title: "Success",
            description: "Service type deleted successfully",
          });
          fetchServiceTypes();
        } else {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete service type');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete service type",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (serviceType: ServiceType) => {
    setForm({
      serviceType: serviceType.serviceType,
      displayName: serviceType.displayName || '',
    });
    setEditingServiceType(serviceType.serviceType);
    setShowDialog(true);
  };

  const resetForm = () => {
    setForm({
      serviceType: "",
      displayName: "",
    });
    setEditingServiceType(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Service Types</CardTitle>
        <Dialog 
          open={showDialog} 
          onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingServiceType ? 'Edit Service Type' : 'Create Service Type'}
              </DialogTitle>
              <DialogDescription>
                {editingServiceType 
                  ? 'Update an existing service type.' 
                  : 'Add a new service type for marriage services.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type Code</Label>
                <Input
                  id="serviceType"
                  value={form.serviceType}
                  onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                  placeholder="e.g. WEDDING_CEREMONY"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be automatically converted to UPPERCASE_WITH_UNDERSCORES
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="e.g. Wedding Ceremony"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? 'Processing...' 
                  : (editingServiceType ? 'Update Service Type' : 'Create Service Type')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {serviceTypes.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No service types found. Add a service type to get started.
          </div>
        ) : (
          <div className="grid gap-4">
            {serviceTypes.map((type) => (
              <div key={type.serviceType} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{formatServiceType(type.serviceType)}</p>
                  <p className="text-sm text-muted-foreground">Code: {type.serviceType}</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDelete(type.serviceType)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}