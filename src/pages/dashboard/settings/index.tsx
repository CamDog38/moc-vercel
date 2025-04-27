import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Edit, Plus, Trash, Link as LinkIcon, Settings, ChevronDown, X, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AuthProvider } from '@/contexts/AuthContext';
import { WebhookVariablesEditor } from "@/components/WebhookVariablesEditor";
import { ServiceTypeManager } from "@/components/ServiceTypeManager";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AddRateDialog from "@/components/AddRateDialog";

interface Officer {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  user?: {
    email: string;
  }
}

interface Rate {
  id: string;
  serviceType: string;
  baseRate: number;
  travelRatePerKm: number | null;
  officerId: string;
  officer: Officer;
}

interface GenericRate {
  id: string;
  serviceType: string;
  baseRate: number;
  travelRatePerKm: number | null;
}

interface ZapierWebhook {
  id: string;
  name: string;
  url: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OfficeLocation {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

import { DEFAULT_SERVICE_TYPES, ServiceTypeMapping, fetchServiceTypes } from '@/util/service-types';

// Add a serviceTypes mapping at the top of the file, before any component
const serviceTypes: Record<string, string> = {
  'REGISTRATION_HOME': 'Registration at your home',
  'REGISTRATION_OFFICE': 'Registration at office',
  'SMALL_CEREMONY': 'Small ceremony',
  'WEDDING_CEREMONY': 'Wedding ceremony',
};

// Helper function to format service type
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

// Define this component similar to AddRateDialog but for editing
interface EditRateDialogProps {
  rate: Rate;
  onRateUpdated: () => void;
}

function EditRateDialog({ rate, onRateUpdated }: EditRateDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    baseRate: rate.baseRate.toString(),
    travelRate: rate.travelRatePerKm ? rate.travelRatePerKm.toString() : "",
  });

  // Reset form when the dialog opens or when the rate changes
  useEffect(() => {
    setForm({
      baseRate: rate.baseRate.toString(),
      travelRate: rate.travelRatePerKm ? rate.travelRatePerKm.toString() : "",
    });
  }, [rate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.baseRate) {
      toast({
        title: "Error",
        description: "Base rate is required",
        variant: "destructive",
      });
      return;
    }
    
    // Validate that the values are valid numbers before sending
    const baseRateNum = parseFloat(form.baseRate);
    const travelRateNum = form.travelRate ? parseFloat(form.travelRate) : null;
    
    if (isNaN(baseRateNum)) {
      toast({
        title: "Error",
        description: "Base rate must be a valid number",
        variant: "destructive",
      });
      return;
    }
    
    if (form.travelRate && isNaN(travelRateNum as number)) {
      toast({
        title: "Error",
        description: "Travel rate must be a valid number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create request data matching the expected format by the API
      const requestData = {
        officerId: rate.officerId,
        serviceType: rate.serviceType,
        baseRate: baseRateNum,
        travelRatePerKm: travelRateNum
      };
      
      // Use the standard API endpoint to update the rate
      const response = await fetch(`/api/rates/${rate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        credentials: 'include',
      });
      
      // Get the response text first for debugging
      const responseText = await response.text();
      
      // Try to parse the response as JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid response format from server');
      }

      if (!response.ok) {
        throw new Error(responseData.error || responseData.details || 'Failed to update rate');
      }
      
      toast({
        title: "Success",
        description: "Service rate updated successfully",
      });
      
      // Close dialog and call the callback
      setOpen(false);
      
      // Call the callback to refresh rates
      if (typeof onRateUpdated === 'function') {
        await onRateUpdated();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update rate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost" 
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Service Rate</DialogTitle>
          <DialogDescription>
            Update the rate for {serviceTypes[rate.serviceType] || rate.serviceType}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseRate">Base Rate (R)</Label>
            <Input
              id="baseRate"
              type="number"
              step="0.01"
              min="0"
              value={form.baseRate}
              onChange={(e) => setForm(prev => ({ ...prev, baseRate: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="travelRate">Travel Rate per km (R, optional)</Label>
            <Input
              id="travelRate"
              type="number"
              step="0.01"
              min="0"
              value={form.travelRate}
              onChange={(e) => setForm(prev => ({ ...prev, travelRate: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Updating...' : 'Update Service Rate'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [genericRates, setGenericRates] = useState<GenericRate[]>([]);
  const [webhooks, setWebhooks] = useState<ZapierWebhook[]>([]);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeMapping>(DEFAULT_SERVICE_TYPES);
  const [genericServiceTypes, setGenericServiceTypes] = useState<Record<string, string>>({});
  const [showOfficerDialog, setShowOfficerDialog] = useState(false);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [showGenericRateDialog, setShowGenericRateDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showVariablesDialog, setShowVariablesDialog] = useState(false);
  const [editingOfficerId, setEditingOfficerId] = useState<string | null>(null);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editingGenericRateId, setEditingGenericRateId] = useState<string | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [officerForm, setOfficerForm] = useState({
    title: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: ""
  });
  const [rateForm, setRateForm] = useState({
    officerId: "",
    serviceType: "",
    baseRate: "",
    travelRate: "",
  });
  const [genericRateForm, setGenericRateForm] = useState({
    serviceType: "",
    baseRate: "",
    travelRate: "",
  });
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    description: "",
    isActive: true,
  });
  const [locationForm, setLocationForm] = useState({
    name: "",
    address: "",
    isActive: true,
  });

  const fetchOfficers = async () => {
    try {
      const response = await fetch('/api/officers');
      const data = await response.json();
      if (response.ok) {
        setOfficers(data);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch officers",
        variant: "destructive",
      });
    }
  };

  const fetchRates = async () => {
    try {
      const response = await fetch('/api/rates');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setRates(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch rates",
        variant: "destructive",
      });
    }
  };

  const fetchGenericRates = async () => {
    try {
      const response = await fetch('/api/generic-rates');
      const data = await response.json();
      if (response.ok) {
        setGenericRates(data);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch generic rates",
        variant: "destructive",
      });
    }
  };

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks');
      const data = await response.json();
      if (response.ok) {
        setWebhooks(data);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch webhooks",
        variant: "destructive",
      });
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const data = await response.json();
      if (response.ok) {
        setLocations(data);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch locations",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOfficers();
    fetchRates();
    fetchGenericRates();
    fetchWebhooks();
    fetchLocations();
    
    // Fetch service types
    const loadServiceTypes = async () => {
      try {
        const types = await fetchServiceTypes();
        setServiceTypes(types);
        
        // Create a separate set of service types for generic rates
        // This ensures they don't mirror marriage officer rates
        const genericTypes: Record<string, string> = {};
        
        // Add default service types
        Object.entries(DEFAULT_SERVICE_TYPES).forEach(([key, value]) => {
          genericTypes[key] = value;
        });
        
        // Add any existing generic rates service types
        const response = await fetch('/api/generic-rates');
        if (response.ok) {
          const data = await response.json();
          data.forEach((rate: any) => {
            if (rate.serviceType) {
              genericTypes[rate.serviceType] = formatServiceType(rate.serviceType);
            }
          });
        }
        
        setGenericServiceTypes(genericTypes);
      } catch (error) {
        // Fall back to default service types
        setServiceTypes(DEFAULT_SERVICE_TYPES);
        setGenericServiceTypes(DEFAULT_SERVICE_TYPES);
      }
    };
    
    loadServiceTypes();
  }, []);

  const handleOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const url = editingOfficerId 
        ? `/api/officers/${editingOfficerId}` 
        : '/api/officers';
      
      const method = editingOfficerId ? 'PUT' : 'POST';
      
      // For editing, don't send the email if it's not being changed
      const { title, firstName, lastName, email, phoneNumber, address } = officerForm;
      
      // If we're editing and the original officer is found
      let finalOfficerData = {
        title,
        firstName,
        lastName,
        email: email || '',
        phoneNumber: phoneNumber || "",
        address: address || "",
      };
      
      // First, create or update the officer
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalOfficerData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save officer');
      }
      
      const data = await response.json();
      const officerId = editingOfficerId || data.id;
      
      // Then update the toast message
      toast({
        title: "Success",
        description: editingOfficerId 
          ? "Marriage officer updated successfully" 
          : "Marriage officer created successfully",
      });
      
      setShowOfficerDialog(false);
      setOfficerForm({
        title: "",
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        address: "",
      });
      setEditingOfficerId(null);
      
      // Refresh data before closing dialog and showing toast
      try {
        await Promise.all([fetchOfficers(), fetchRates()]);
      } catch (refreshError) {
        // Keep minimal error logging for critical errors
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create marriage officer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const url = editingRateId 
        ? `/api/rates/${editingRateId}` 
        : '/api/rates';
      
      const method = editingRateId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...rateForm,
          baseRate: parseFloat(rateForm.baseRate),
          travelRate: rateForm.travelRate ? parseFloat(rateForm.travelRate) : null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // Refresh data before closing dialog
        await Promise.all([fetchRates(), fetchOfficers()]);
        
        toast({
          title: "Success",
          description: editingRateId 
            ? "Service rate updated successfully" 
            : "Service rate created successfully",
        });
        setShowRateDialog(false);
        setRateForm({
          officerId: "",
          serviceType: "",
          baseRate: "",
          travelRate: "",
        });
        setEditingRateId(null);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create service rate",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenericRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Validate the service type
      if (!genericRateForm.serviceType || !genericRateForm.serviceType.trim()) {
        toast({
          title: "Error",
          description: "Service type cannot be empty",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      const url = editingGenericRateId 
        ? `/api/generic-rates/${editingGenericRateId}` 
        : '/api/generic-rates';
      
      const method = editingGenericRateId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceType: genericRateForm.serviceType.trim(),
          baseRate: parseFloat(genericRateForm.baseRate),
          travelRatePerKm: genericRateForm.travelRate ? parseFloat(genericRateForm.travelRate) : null,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: editingGenericRateId 
            ? "Generic service rate updated successfully" 
            : "Generic service rate created successfully",
        });
        
        setShowGenericRateDialog(false);
        resetGenericRateForm();
        fetchGenericRates(); // Refresh only the generic rates
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save generic rate');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save generic rate",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOfficer = async (id: string) => {
    if (confirm("Are you sure you want to delete this marriage officer? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/officers/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          toast({
            title: "Success",
            description: "Marriage officer deleted successfully",
          });
          fetchOfficers();
        } else {
          const data = await response.json();
          throw new Error(data.error);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete marriage officer",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (confirm("Are you sure you want to delete this service rate? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/rates/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          toast({
            title: "Success",
            description: "Service rate deleted successfully",
          });
          fetchRates();
        } else {
          const data = await response.json();
          throw new Error(data.error);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete service rate",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteGenericRate = async (id: string) => {
    if (confirm("Are you sure you want to delete this generic service rate? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/generic-rates/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          toast({
            title: "Success",
            description: "Generic service rate deleted successfully",
          });
          fetchGenericRates();
        } else {
          const data = await response.json();
          throw new Error(data.error);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete generic service rate",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditOfficer = async (officer: Officer) => {
    // Prevent multiple edits if already submitting
    if (isSubmitting) return;
    
    // Fetch the officer's rates
    try {
      setIsSubmitting(true);
      
      // Fetch the latest officer data to ensure we have the most up-to-date information
      const officerResponse = await fetch(`/api/officers/${officer.id}`);
      if (!officerResponse.ok) {
        throw new Error('Failed to fetch officer details');
      }
      const officerData = await officerResponse.json();
      
      // Rates are now managed separately
      
      setOfficerForm({
        title: officerData.title || officer.title || '',
        firstName: officerData.firstName || officer.firstName || '',
        lastName: officerData.lastName || officer.lastName || '',
        email: officer.user?.email || officer.email || '',
        phoneNumber: officerData.phoneNumber || officer.phoneNumber || '',
        address: officerData.address || officer.address || '',
      });
      
      setEditingOfficerId(officer.id);
      setShowOfficerDialog(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load officer service rates",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRate = (rate: Rate) => {
    setRateForm({
      officerId: rate.officerId,
      serviceType: rate.serviceType,
      baseRate: rate.baseRate.toString(),
      travelRate: rate.travelRatePerKm ? rate.travelRatePerKm.toString() : "",
    });
    setEditingRateId(rate.id);
    setShowRateDialog(true);
  };

  const handleEditGenericRate = (rate: GenericRate) => {
    setGenericRateForm({
      serviceType: rate.serviceType,
      baseRate: rate.baseRate.toString(),
      travelRate: rate.travelRatePerKm ? rate.travelRatePerKm.toString() : "",
    });
    setEditingGenericRateId(rate.id);
    setShowGenericRateDialog(true);
  };

  const handleWebhookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const url = editingWebhookId 
        ? `/api/webhooks/${editingWebhookId}` 
        : '/api/webhooks';
      
      const method = editingWebhookId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookForm),
      });

      const data = await response.json();
      if (response.ok) {
        // Refresh data before closing dialog
        await fetchWebhooks();
        
        toast({
          title: "Success",
          description: editingWebhookId 
            ? "Webhook updated successfully" 
            : "Webhook created successfully",
        });
        setShowWebhookDialog(false);
        setWebhookForm({
          name: "",
          url: "",
          description: "",
          isActive: true,
        });
        setEditingWebhookId(null);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create webhook",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (confirm("Are you sure you want to delete this webhook? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/webhooks/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          toast({
            title: "Success",
            description: "Webhook deleted successfully",
          });
          fetchWebhooks();
        } else {
          const data = await response.json();
          throw new Error(data.error);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete webhook",
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleWebhook = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Webhook ${isActive ? 'disabled' : 'enabled'} successfully`,
        });
        fetchWebhooks();
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update webhook",
        variant: "destructive",
      });
    }
  };

  const resetOfficerForm = () => {
    setOfficerForm({
      title: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      address: ""
    });
    setEditingOfficerId(null);
  };

  const resetRateForm = () => {
    setRateForm({
      officerId: "",
      serviceType: "",
      baseRate: "",
      travelRate: "",
    });
    setEditingRateId(null);
  };

  const resetGenericRateForm = () => {
    setGenericRateForm({
      serviceType: "",
      baseRate: "",
      travelRate: "",
    });
    setEditingGenericRateId(null);
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const url = editingLocationId 
        ? `/api/locations/${editingLocationId}` 
        : '/api/locations';
      
      const method = editingLocationId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationForm),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Success",
          description: editingLocationId 
            ? "Office location updated successfully" 
            : "Office location created successfully",
        });
        setShowLocationDialog(false);
        setLocationForm({
          name: "",
          address: "",
          isActive: true,
        });
        setEditingLocationId(null);
        fetchLocations();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save office location",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteLocation = async (id: string) => {
    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Success",
          description: "Office location deleted successfully",
        });
        fetchLocations();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete office location",
        variant: "destructive",
      });
    }
  };
  
  const handleEditLocation = (location: OfficeLocation) => {
    setLocationForm({
      name: location.name,
      address: location.address,
      isActive: location.isActive,
    });
    setEditingLocationId(location.id);
    setShowLocationDialog(true);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Email Management</CardTitle>
            <Button onClick={() => router.push('/dashboard/emails')}>
              <Plus className="h-4 w-4 mr-2" />
              Manage Emails
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Manage your email templates, rules, and communication settings for automated responses.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Email Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create and customize email templates for various communications.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/emails/templates/new')}
                  >
                    Create Template
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Email Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Set up automated email rules based on triggers and conditions.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/emails/rules/new')}
                  >
                    Create Rule
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Email Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View history and logs of all sent emails and communications.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/emails?tab=logs')}
                  >
                    View Logs
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>PDF Templates</CardTitle>
            <Button onClick={() => router.push('/dashboard/pdf-templates')}>
              <Plus className="h-4 w-4 mr-2" />
              Manage PDF Templates
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Manage your PDF templates for invoices, bookings, and certificates. Create, edit, and preview templates.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Invoice Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Customize how your invoices look when sent to clients.
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/pdf-templates?filter=INVOICE')}
                  >
                    View Templates
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/pdf-templates/update-invoice-template', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                        });
                        
                        if (!response.ok) {
                          throw new Error('Failed to update invoice template');
                        }
                        
                        toast({
                          title: "Success",
                          description: "Invoice template updated with payment details",
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: error instanceof Error ? error.message : "Failed to update invoice template",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Update Payment Details
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Booking Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Customize booking confirmations and related documents.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/pdf-templates?filter=BOOKING')}
                  >
                    View Templates
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Certificate Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Customize marriage certificates and other official documents.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/pdf-templates?filter=CERTIFICATE')}
                  >
                    View Templates
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Content Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Manage your forms, automations, and email templates to streamline your workflow.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Forms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create and manage forms for collecting information from clients.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/forms')}
                  >
                    Manage Forms
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Form Styles</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Customize the appearance of your forms with CSS styling.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/settings/form-styles')}
                  >
                    Manage Form Styles
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Automations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Set up automated email responses for form submissions.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/forms/automations')}
                  >
                    Manage Automations
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Email Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create and manage email templates for client communications.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/emails')}
                  >
                    Manage Emails
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              View and manage system settings and environment configuration.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Environment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View current environment settings and configuration.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/settings/environment')}
                  >
                    View Environment
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">URL Resolution</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Diagnose URL resolution for different environments.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/settings/url-resolution')}
                  >
                    View URL Diagnostics
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Invoice Numbering</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Configure custom invoice ID format and officer initials.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/settings/invoice-numbering')}
                  >
                    Configure Invoice IDs
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">API Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View API logs and troubleshoot system issues.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/debug/api-logs')}
                  >
                    View Logs
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Booking Forms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Configure which booking form is used for email templates.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/settings/booking-forms')}
                  >
                    Configure Booking Forms
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Email Troubleshooting</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Troubleshoot email sending and template issues.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/emails/troubleshoot')}
                  >
                    Troubleshoot
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Email Delay Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Configure delay for automated emails to ensure proper variable processing.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/settings/email-delay')}
                  >
                    Configure Delay
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Zapier Webhooks</CardTitle>
            <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Zapier Webhook</DialogTitle>
                  <DialogDescription>
                    Create a new webhook to send invoice data to Zapier.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleWebhookSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={webhookForm.name || ""}
                      onChange={(e) =>
                        setWebhookForm({ ...webhookForm, name: e.target.value })
                      }
                      placeholder="e.g. Invoice to QuickBooks"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="url">Webhook URL</Label>
                    <Input
                      id="url"
                      value={webhookForm.url || ""}
                      onChange={(e) =>
                        setWebhookForm({ ...webhookForm, url: e.target.value })
                      }
                      placeholder="https://hooks.zapier.com/..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={webhookForm.description || ""}
                      onChange={(e) =>
                        setWebhookForm({ ...webhookForm, description: e.target.value })
                      }
                      placeholder="What this webhook is used for"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={webhookForm.isActive}
                      onCheckedChange={(checked) =>
                        setWebhookForm({ ...webhookForm, isActive: checked })
                      }
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting 
                      ? 'Processing...' 
                      : (editingWebhookId ? 'Update Webhook' : 'Create Webhook')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {webhooks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No webhooks found. Add a webhook to send invoice data to Zapier.
              </div>
            ) : (
              <div className="grid gap-4">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{webhook.name}</p>
                        <div className={`h-2 w-2 rounded-full ${webhook.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <LinkIcon className="h-3 w-3 mr-1" />
                        {webhook.url.length > 50 ? webhook.url.substring(0, 50) + '...' : webhook.url}
                      </p>
                      {webhook.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {webhook.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingWebhookId(webhook.id);
                          setShowVariablesDialog(true);
                        }}
                        className="flex items-center gap-1"
                      >
                        <Settings className="h-4 w-4" />
                        Variables
                      </Button>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`active-${webhook.id}`}
                          checked={webhook.isActive}
                          onCheckedChange={() => handleToggleWebhook(webhook.id, webhook.isActive)}
                        />
                        <Label htmlFor={`active-${webhook.id}`} className="sr-only">
                          Active
                        </Label>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteWebhook(webhook.id)}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Marriage Officers</CardTitle>
            <Dialog 
              open={showOfficerDialog} 
              onOpenChange={(open) => {
                setShowOfficerDialog(open);
                if (!open) resetOfficerForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Officer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingOfficerId ? 'Edit Marriage Officer' : 'Create Marriage Officer'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingOfficerId 
                      ? 'Update the details of an existing marriage officer.' 
                      : 'Add a new marriage officer to the system.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleOfficerSubmit} className="space-y-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="personal-info">
                      <AccordionTrigger>Personal Information</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="title">Title</Label>
                              <Input
                                id="title"
                                value={officerForm.title || ""}
                                onChange={(e) => setOfficerForm({ ...officerForm, title: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="firstName">First Name</Label>
                              <Input
                                id="firstName"
                                value={officerForm.firstName || ""}
                                onChange={(e) => setOfficerForm({ ...officerForm, firstName: e.target.value })}
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              value={officerForm.lastName || ""}
                              onChange={(e) => setOfficerForm({ ...officerForm, lastName: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={officerForm.email || ""}
                              onChange={(e) => setOfficerForm({ ...officerForm, email: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input
                              id="phoneNumber"
                              value={officerForm.phoneNumber || ""}
                              onChange={(e) => setOfficerForm({ ...officerForm, phoneNumber: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea
                              id="address"
                              value={officerForm.address || ""}
                              onChange={(e) => setOfficerForm({ ...officerForm, address: e.target.value })}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="service-rates">
                      <AccordionTrigger>
                        Service Rates
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {editingOfficerId ? (
                            <>
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-semibold">Manage Service Rates</h4>
                                <AddRateDialog 
                                  officerId={editingOfficerId} 
                                  onRateAdded={async () => {
                                    await fetchRates();
                                  }}
                                />
                              </div>
                              
                              <div className="text-xs text-muted-foreground mb-4">
                                Rates are saved immediately when added. After updating the officer details, you'll see the updated rates list.
                              </div>
                              
                              <div className="overflow-auto max-h-60">
                                <table className="w-full border-collapse">
                                  <thead className="bg-muted text-sm">
                                    <tr>
                                      <th className="text-left p-2">Service Type</th>
                                      <th className="text-right p-2">Base Rate</th>
                                      <th className="text-right p-2">Travel Rate</th>
                                      <th className="p-2 w-10"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {rates
                                      .filter(rate => rate.officerId === editingOfficerId)
                                      .map(rate => (
                                        <tr key={rate.id} className="text-sm">
                                          <td className="p-2">{serviceTypes[rate.serviceType] || rate.serviceType}</td>
                                          <td className="p-2 text-right">R{rate.baseRate}</td>
                                          <td className="p-2 text-right">{rate.travelRatePerKm ? `R${rate.travelRatePerKm}/km` : '-'}</td>
                                          <td className="p-2 text-right flex items-center justify-end space-x-1">
                                            <EditRateDialog 
                                              rate={rate}
                                              onRateUpdated={async () => {
                                                await fetchRates();
                                              }}
                                            />
                                            <Button
                                              variant="ghost" 
                                              size="sm"
                                              onClick={() => handleDeleteRate(rate.id)}
                                              className="h-8 w-8 p-0"
                                            >
                                              <Trash className="h-4 w-4" />
                                            </Button>
                                          </td>
                                        </tr>
                                      ))}
                                    {rates.filter(rate => rate.officerId === editingOfficerId).length === 0 && (
                                      <tr>
                                        <td colSpan={4} className="p-4 text-center text-muted-foreground">
                                          No rates found. Add a rate using the button above.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-4 text-muted-foreground">
                              Save the officer first to manage their rates
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting 
                      ? 'Processing...' 
                      : (editingOfficerId ? 'Update Officer' : 'Create Officer')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {officers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No marriage officers found.
              </div>
            ) : (
              <div className="grid gap-4">
                {officers.map((officer) => (
                  <div key={officer.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {officer.title} {officer.firstName} {officer.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{officer.user?.email || officer.email || 'No email'}</p>
                      <p className="text-sm text-muted-foreground">
                        {officer.phoneNumber} | {officer.address}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditOfficer(officer)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteOfficer(officer.id)}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generic Service Rates</CardTitle>
            <Dialog 
              open={showGenericRateDialog} 
              onOpenChange={(open) => {
                setShowGenericRateDialog(open);
                if (!open) resetGenericRateForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Generic Rate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingGenericRateId ? 'Edit Generic Service Rate' : 'Create Generic Service Rate'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingGenericRateId 
                      ? 'Update the details of an existing generic service rate.' 
                      : 'Add a new generic service rate that is not tied to a specific marriage officer.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleGenericRateSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Service Type</Label>
                    <Input
                      id="serviceType"
                      type="text"
                      placeholder="Enter service type (e.g. Wedding ceremony)"
                      value={genericRateForm.serviceType || ""}
                      onChange={(e) => setGenericRateForm({ ...genericRateForm, serviceType: e.target.value })}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter a descriptive name for this generic service
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="baseRate">Base Rate (R)</Label>
                    <Input
                      id="baseRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={genericRateForm.baseRate || ""}
                      onChange={(e) => setGenericRateForm({ ...genericRateForm, baseRate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travelRate">Travel Rate per km (R, optional)</Label>
                    <Input
                      id="travelRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={genericRateForm.travelRate || ""}
                      onChange={(e) => setGenericRateForm({ ...genericRateForm, travelRate: e.target.value })}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting 
                      ? 'Processing...' 
                      : (editingGenericRateId ? 'Update Rate' : 'Create Rate')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {genericRates.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No generic service rates found.
              </div>
            ) : (
              <div className="grid gap-4">
                {genericRates.map((rate) => (
                  <div key={rate.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{formatServiceType(rate.serviceType)}</p>
                      <p className="text-sm text-muted-foreground">
                        Base Rate: R{rate.baseRate} | Travel Rate: R{rate.travelRatePerKm || 0}/km
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditGenericRate(rate)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteGenericRate(rate.id)}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Locations</CardTitle>
            <Button onClick={() => setShowLocationDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locations.map((location) => (
                <div key={location.id} className="flex items-center justify-between border-b pb-2">
                  <div className="max-w-[calc(100%-80px)]">
                    <div className="font-medium">{location.name}</div>
                    <div className="text-sm text-muted-foreground break-words overflow-hidden">
                      {location.address.includes("http") ? (
                        <a 
                          href={location.address} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline text-blue-500 dark:text-blue-400"
                        >
                          {location.address.length > 60 
                            ? location.address.substring(0, 60) + "..." 
                            : location.address}
                        </a>
                      ) : (
                        location.address
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditLocation(location)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteLocation(location.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <ServiceTypeManager />
      </div>

      {/* Rate Dialog */}
      <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRateId ? "Edit Service Rate" : "Create Service Rate"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="officerId">Officer</Label>
              <select
                id="officerId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={rateForm.officerId || ""}
                onChange={(e) => setRateForm({ ...rateForm, officerId: e.target.value })}
                required
              >
                <option value="">Select an officer</option>
                {officers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.title} {officer.firstName} {officer.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <select
                id="serviceType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={rateForm.serviceType || ""}
                onChange={(e) => setRateForm({ ...rateForm, serviceType: e.target.value })}
                required
              >
                <option value="">Select a service type</option>
                {Object.entries(serviceTypes).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseRate">Base Rate (R)</Label>
              <Input
                id="baseRate"
                type="number"
                min="0"
                step="0.01"
                value={rateForm.baseRate || ""}
                onChange={(e) => setRateForm({ ...rateForm, baseRate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="travelRate">Travel Rate per km (R, optional)</Label>
              <Input
                id="travelRate"
                type="number"
                min="0"
                step="0.01"
                value={rateForm.travelRate || ""}
                onChange={(e) => setRateForm({ ...rateForm, travelRate: e.target.value })}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? 'Processing...' 
                : (editingRateId ? 'Update Rate' : 'Create Rate')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocationId ? "Edit Location" : "Add Location"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLocationSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="location-name">Location Name</Label>
                <Input
                  id="location-name"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  placeholder="e.g., Main Office"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location-address">Address</Label>
                <Input
                  id="location-address"
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  placeholder="e.g., 123 Wedding St"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="location-active"
                  checked={locationForm.isActive}
                  onCheckedChange={(checked) => setLocationForm({ ...locationForm, isActive: checked })}
                />
                <Label htmlFor="location-active">Active</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowLocationDialog(false);
                  setLocationForm({
                    name: "",
                    address: "",
                    isActive: true,
                  });
                  setEditingLocationId(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? 'Processing...' 
                  : (editingLocationId ? 'Update Location' : 'Create Location')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Webhook Variables Editor */}
      {editingWebhookId && (
        <WebhookVariablesEditor
          webhookId={editingWebhookId}
          isOpen={showVariablesDialog}
          onClose={() => {
            setShowVariablesDialog(false);
            setEditingWebhookId(null);
          }}
          onSave={fetchWebhooks}
        />
      )}
    </div>
  );
}