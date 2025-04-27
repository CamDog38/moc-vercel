import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function RatesDebugPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [officers, setOfficers] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<Record<string, string>>({});
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [form, setForm] = useState({
    serviceType: '',
    baseRate: '',
    travelRate: '',
  });
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    fetchOfficers();
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    if (selectedOfficer) {
      fetchOfficerRates(selectedOfficer);
    }
  }, [selectedOfficer]);

  const fetchOfficers = async () => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Fetching officers...');
      }
      const response = await fetch('/api/officers', {
        credentials: 'include'
      });
      const data = await response.json();
      if (process.env.NODE_ENV !== 'production') {
        console.log('Fetched officers:', data);
      }
      setOfficers(data);
    } catch (error) {
      console.error('Error fetching officers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load officers',
        variant: 'destructive',
      });
    }
  };

  const fetchServiceTypes = async () => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Fetching service types...');
      }
      const response = await fetch('/api/service-types', {
        credentials: 'include'
      });
      const data = await response.json();
      
      // Convert to Record<string, string> format
      const typesMap: Record<string, string> = {};
      data.forEach((type: any) => {
        typesMap[type.serviceType] = type.displayName || type.serviceType;
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Fetched service types:', typesMap);
      }
      setServiceTypes(typesMap);
    } catch (error) {
      console.error('Error fetching service types:', error);
    }
  };

  const fetchOfficerRates = async (officerId: string) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Fetching rates for officer ${officerId}...`);
      }
      const response = await fetch(`/api/rates?officerId=${officerId}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache' // Prevent browser caching
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status}):`, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Fetched ${data.length} rates for officer:`, data);
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log('Rate IDs:', data.map((r: any) => r.id));
      }
      setRates(data);
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load rates',
        variant: 'destructive',
      });
    }
  };

  const handleAddRate = async () => {
    if (!selectedOfficer || !form.serviceType || !form.baseRate) {
      toast({
        title: 'Validation Error',
        description: 'Please select an officer and provide service type and base rate',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      // Format data
      const baseRateNum = parseFloat(form.baseRate);
      const travelRateNum = form.travelRate ? parseFloat(form.travelRate) : null;

      if (isNaN(baseRateNum)) {
        throw new Error('Base rate must be a valid number');
      }

      if (form.travelRate && isNaN(travelRateNum as number)) {
        throw new Error('Travel rate must be a valid number');
      }

      const requestData = {
        officerId: selectedOfficer,
        serviceType: form.serviceType,
        baseRate: baseRateNum,
        travelRatePerKm: travelRateNum,
      };

      if (process.env.NODE_ENV !== 'production') {
        console.log('Submitting rate with data:', requestData);
      }

      // Use test endpoint
      const response = await fetch('/api/test/rate-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        credentials: 'include',
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('Response status:', response.status);
      }
      const responseText = await response.text();
      if (process.env.NODE_ENV !== 'production') {
        console.log('Response text:', responseText);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to add rate');
      }

      setTestResult(responseData);
      
      toast({
        title: 'Success',
        description: 'Rate added successfully',
      });

      // Clear form
      setForm({
        serviceType: '',
        baseRate: '',
        travelRate: '',
      });

      // Fetch updated rates
      await fetchOfficerRates(selectedOfficer);
      
    } catch (error) {
      console.error('Error adding rate:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Rates Debug Tool</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add Rate</CardTitle>
              <CardDescription>
                Test adding a rate using the test endpoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="officer">Marriage Officer</Label>
                  <Select
                    value={selectedOfficer}
                    onValueChange={setSelectedOfficer}
                  >
                    <SelectTrigger id="officer">
                      <SelectValue placeholder="Select an officer" />
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
                
                <div>
                  <Label htmlFor="serviceType">Service Type</Label>
                  <Select
                    value={form.serviceType}
                    onValueChange={(value) => setForm(prev => ({ ...prev, serviceType: value }))}
                  >
                    <SelectTrigger id="serviceType">
                      <SelectValue placeholder="Select a service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(serviceTypes).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="baseRate">Base Rate (R)</Label>
                  <Input
                    id="baseRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.baseRate}
                    onChange={(e) => setForm(prev => ({ ...prev, baseRate: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
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
                
                <Button 
                  onClick={handleAddRate}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Adding...' : 'Add Rate'}
                </Button>
                
                <Button 
                  variant="default"
                  onClick={() => {
                    fetchOfficerRates(selectedOfficer);
                    toast({
                      title: "Refreshed",
                      description: "Rates list refreshed from server",
                    });
                  }}
                  className="w-full mt-2"
                >
                  Refresh Rates
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                Test results and current rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResult && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Last Test Result:</h3>
                  <div className="bg-secondary p-3 rounded-md overflow-auto max-h-40">
                    <pre className="text-xs">{JSON.stringify(testResult, null, 2)}</pre>
                  </div>
                </div>
              )}
              
              <h3 className="text-lg font-medium mb-2">Current Rates:</h3>
              {rates.length > 0 ? (
                <div className="space-y-2">
                  {rates.map(rate => (
                    <div key={rate.id} className="border rounded-md p-3">
                      <div><strong>ID:</strong> {rate.id}</div>
                      <div><strong>Service Type:</strong> {serviceTypes[rate.serviceType] || rate.serviceType}</div>
                      <div><strong>Base Rate:</strong> R{rate.baseRate}</div>
                      {rate.travelRatePerKm && (
                        <div><strong>Travel Rate:</strong> R{rate.travelRatePerKm}/km</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedOfficer 
                    ? "No rates found for this officer" 
                    : "Select an officer to view rates"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
} 