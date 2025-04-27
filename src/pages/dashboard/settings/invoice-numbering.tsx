import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function InvoiceNumberingSettings() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState('');
  const [officers, setOfficers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [officerInitials, setOfficerInitials] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchOfficers();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const settings = await response.json();
      const invoiceNumberSetting = settings.find((s: any) => s.key === 'lastInvoiceNumber');
      
      if (invoiceNumberSetting) {
        setLastInvoiceNumber(invoiceNumberSetting.value);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invoice numbering settings',
        variant: 'destructive',
      });
    }
  };

  const fetchOfficers = async () => {
    try {
      const response = await fetch('/api/officers');
      if (!response.ok) throw new Error('Failed to fetch officers');
      
      const data = await response.json();
      setOfficers(data);
      
      // Initialize officer initials
      const initials: Record<string, string> = {};
      data.forEach((officer: any) => {
        if (officer.initials) {
          initials[officer.id] = officer.initials;
        }
      });
      setOfficerInitials(initials);
    } catch (error) {
      console.error('Error fetching officers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load officer data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveInvoiceNumber = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'lastInvoiceNumber',
          value: lastInvoiceNumber,
          description: 'Last used invoice number',
        }),
      });

      if (!response.ok) throw new Error('Failed to save invoice number');

      toast({
        title: 'Success',
        description: 'Invoice number saved successfully',
      });
    } catch (error) {
      console.error('Error saving invoice number:', error);
      toast({
        title: 'Error',
        description: 'Failed to save invoice number',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveOfficerInitials = async (officerId: string) => {
    try {
      const response = await fetch(`/api/officers/${officerId}/initials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initials: officerInitials[officerId],
        }),
      });

      if (!response.ok) throw new Error('Failed to save officer initials');

      toast({
        title: 'Success',
        description: 'Officer initials saved successfully',
      });
    } catch (error) {
      console.error('Error saving officer initials:', error);
      toast({
        title: 'Error',
        description: 'Failed to save officer initials',
        variant: 'destructive',
      });
    }
  };

  const handleInitialsChange = (officerId: string, value: string) => {
    setOfficerInitials(prev => ({
      ...prev,
      [officerId]: value,
    }));
  };

  if (loading || isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Invoice Numbering Settings</h1>
          <p className="text-muted-foreground">Configure how invoice numbers are generated</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Last Used Invoice Number</CardTitle>
            <CardDescription>
              Set the last used invoice number. New invoices will start from the next number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="lastInvoiceNumber">Last Used Number</Label>
                <Input
                  id="lastInvoiceNumber"
                  value={lastInvoiceNumber}
                  onChange={(e) => setLastInvoiceNumber(e.target.value)}
                  placeholder="e.g., INV-2024-001"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={saveInvoiceNumber} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Officer Initials</CardTitle>
            <CardDescription>
              Set initials for each officer to be used in invoice numbers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {officers.map((officer) => (
                <div key={officer.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor={`initials-${officer.id}`}>
                      {officer.firstName} {officer.lastName}
                    </Label>
                    <Input
                      id={`initials-${officer.id}`}
                      value={officerInitials[officer.id] || ''}
                      onChange={(e) => handleInitialsChange(officer.id, e.target.value)}
                      placeholder="e.g., JH"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => saveOfficerInitials(officer.id)}>
                      Save
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}