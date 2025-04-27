import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardLayout from '@/components/layouts/DashboardLayout';

interface MarriageOfficer {
  id: string;
  firstName: string;
  lastName: string;
}

interface ServiceType {
  serviceType: string;
  displayName: string;
}

export default function RateSubmissionTest() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [officers, setOfficers] = useState<MarriageOfficer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [selectedOfficer, setSelectedOfficer] = useState<string>('');
  const [form, setForm] = useState({
    serviceType: '',
    baseRate: '',
    travelRatePerKm: '',
  });
  const [result, setResult] = useState<any>(null);

  // Fetch marriage officers
  useEffect(() => {
    const fetchOfficers = async () => {
      try {
        const response = await fetch('/api/officers');
        if (response.ok) {
          const data = await response.json();
          setOfficers(data);
        } else {
          console.error('Failed to fetch officers:', await response.text());
          toast({
            title: 'Error',
            description: 'Failed to fetch marriage officers',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching officers:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch marriage officers',
          variant: 'destructive',
        });
      }
    };

    fetchOfficers();
  }, [toast]);

  // Fetch service types
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const response = await fetch('/api/service-types');
        if (response.ok) {
          const data = await response.json();
          setServiceTypes(data);
        } else {
          console.error('Failed to fetch service types:', await response.text());
          toast({
            title: 'Error',
            description: 'Failed to fetch service types',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching service types:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch service types',
          variant: 'destructive',
        });
      }
    };

    fetchServiceTypes();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOfficer || !form.serviceType || !form.baseRate) {
      toast({
        title: 'Error',
        description: 'Officer, service type, and base rate are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      // Validate that the values are valid numbers before sending
      const baseRateNum = parseFloat(form.baseRate);
      const travelRateNum = form.travelRatePerKm ? parseFloat(form.travelRatePerKm) : null;
      
      if (isNaN(baseRateNum)) {
        throw new Error('Base rate must be a valid number');
      }
      
      if (form.travelRatePerKm && isNaN(travelRateNum as number)) {
        throw new Error('Travel rate must be a valid number');
      }
      
      const requestData = {
        serviceType: form.serviceType,
        baseRate: baseRateNum,
        travelRatePerKm: travelRateNum,
        officerId: selectedOfficer,
      };
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Submitting test rate with data:', requestData);
      }
      
      // Use the test API endpoint
      const response = await fetch('/api/test/rate-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        credentials: 'include',
      });
      
      const responseText = await response.text();
      if (process.env.NODE_ENV !== 'production') {
        console.log('Response text:', responseText);
      }
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing response JSON:', parseError);
        console.error('Raw response text:', responseText);
        throw new Error('Invalid response format from server');
      }
      
      setResult({
        success: response.ok,
        status: response.status,
        data: responseData,
      });
      
      if (!response.ok) {
        console.error('Server returned error:', responseData);
        throw new Error(responseData.error || responseData.details || 'Failed to add rate');
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Test rate submitted successfully:', responseData);
      }
      
      toast({
        title: 'Success',
        description: 'Test rate submitted successfully',
      });
    } catch (error) {
      console.error('Error submitting test rate:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit test rate',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Test Rate Submission</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Test Rate</CardTitle>
              <CardDescription>
                Test the rate submission process for marriage officers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="officer">Marriage Officer</Label>
                  <Select
                    value={selectedOfficer}
                    onValueChange={setSelectedOfficer}
                  >
                    <SelectTrigger id="officer">
                      <SelectValue placeholder="Select a marriage officer" />
                    </SelectTrigger>
                    <SelectContent>
                      {officers.map((officer) => (
                        <SelectItem key={officer.id} value={officer.id}>
                          {officer.firstName} {officer.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="serviceType">Service Type</Label>
                  <Select
                    value={form.serviceType}
                    onValueChange={(value) => setForm({ ...form, serviceType: value })}
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
                    onChange={(e) => setForm({ ...form, baseRate: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="travelRatePerKm">Travel Rate per km (R) (Optional)</Label>
                  <Input
                    id="travelRatePerKm"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.travelRatePerKm}
                    onChange={(e) => setForm({ ...form, travelRatePerKm: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Test Rate'}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                View the results of your test submission.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-md bg-muted">
                    <h3 className="font-medium mb-2">
                      Status: <span className={result.success ? 'text-green-500' : 'text-red-500'}>
                        {result.success ? 'Success' : 'Error'} ({result.status})
                      </span>
                    </h3>
                    <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Submit a test rate to see results here
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}