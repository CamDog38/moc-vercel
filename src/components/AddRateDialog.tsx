import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';

interface AddRateDialogProps {
  officerId: string;
  onRateAdded: () => void;
}

export default function AddRateDialog({ officerId, onRateAdded }: AddRateDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<{ serviceType: string; displayName: string }[]>([]);
  const [form, setForm] = useState({
    serviceType: "",
    baseRate: "",
    travelRate: "",
  });

  // Fetch service types when dialog opens
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    
    if (isOpen && user) {
      try {
        const response = await fetch('/api/service-types', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(await response.text());
        }
        
        const data = await response.json();
        setServiceTypes(data);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load service types",
          variant: "destructive",
        });
      }
    } else {
      // Reset form when dialog closes
      setForm({
        serviceType: "",
        baseRate: "",
        travelRate: "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add rates",
        variant: "destructive",
      });
      return;
    }

    if (!form.serviceType || !form.baseRate) {
      toast({
        title: "Error",
        description: "Service type and base rate are required",
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
        officerId,
        serviceType: form.serviceType,
        baseRate: baseRateNum,
        travelRatePerKm: travelRateNum  // API expects travelRatePerKm, not travelRate
      };
      
      // Use the test API endpoint that's working
      const response = await fetch('/api/test/rate-submission', {
        method: 'POST',
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
        console.error('Raw response text:', responseText);
        throw new Error('Invalid response format from server');
      }

      if (!response.ok) {
        console.error('Server returned error:', responseData);
        throw new Error(responseData.error || responseData.details || 'Failed to add rate');
      }
      
      toast({
        title: "Success",
        description: "Service rate added successfully",
      });
      
      // Close dialog and reset form immediately
      setOpen(false);
      setForm({
        serviceType: "",
        baseRate: "",
        travelRate: "",
      });
      
      // Call the callback to refresh rates
      if (typeof onRateAdded === 'function') {
        try {
          await onRateAdded();
        } catch (callbackError) {
          console.error('Error in onRateAdded callback:', callbackError);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add rate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => {}}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service Rate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Service Rate</DialogTitle>
          <DialogDescription>
            Add a new service rate for this marriage officer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Select
              value={form.serviceType}
              onValueChange={(value) => {
                setForm(prev => ({ ...prev, serviceType: value }));
              }}
            >
              <SelectTrigger id="serviceType">
                <SelectValue placeholder="Select a service type" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((type) => (
                  <SelectItem key={type.serviceType} value={type.serviceType}>
                    {type.displayName || type.serviceType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseRate">Base Rate (R)</Label>
            <Input
              id="baseRate"
              type="number"
              step="0.01"
              min="0"
              value={form.baseRate}
              onChange={(e) => {
                setForm(prev => ({ ...prev, baseRate: e.target.value }));
              }}
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
              onChange={(e) => {
                setForm(prev => ({ ...prev, travelRate: e.target.value }));
              }}
              placeholder="0.00"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Adding...' : 'Add Service Rate'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}