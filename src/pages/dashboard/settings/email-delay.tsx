import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function EmailDelaySettings() {
  const [delay, setDelay] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Fetch current delay setting
    const fetchDelay = async () => {
      try {
        const response = await fetch('/api/settings/email-delay');
        const data = await response.json();
        
        if (data.delay !== undefined) {
          setDelay(data.delay.toString());
        }
      } catch (error) {
        console.error('Error fetching email delay:', error);
        toast({
          title: 'Error',
          description: 'Failed to load email delay setting',
          variant: 'destructive'
        });
      }
    };

    fetchDelay();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/settings/email-delay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ delay: parseInt(delay, 10) })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Email delay updated to ${data.delay} seconds`,
          variant: 'default'
        });
      } else {
        throw new Error(data.error || 'Failed to update email delay');
      }
    } catch (error) {
      console.error('Error updating email delay:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update email delay',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Email Processing Delay Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="delay" className="block text-sm font-medium text-gray-700">
                Delay (in seconds)
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Set how long to wait before processing emails after form submission. This helps ensure all data is properly saved.
              </p>
              <div className="flex gap-4">
                <Input
                  id="delay"
                  type="number"
                  min="0"
                  value={delay}
                  onChange={(e) => setDelay(e.target.value)}
                  placeholder="Enter delay in seconds"
                  className="max-w-[200px]"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}