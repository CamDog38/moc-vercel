import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import Head from 'next/head';
import { Loader2 } from 'lucide-react';

export default function TestBookingLinkPage() {
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState('');
  const [formId, setFormId] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [html, setHtml] = useState<string>(`
<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
  <h2>Your Booking Link</h2>
  <p>Dear {{name}},</p>
  <p>Thank you for your interest. Please use the link below to complete your booking:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{bookingLink}}" style="background-color: #4CAF50; color: white; padding: 15px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">
      Complete Your Booking
    </a>
  </div>
  
  <p>If the button above doesn't work, you can also click this link: <a href="{{bookingLink}}">{{bookingLink}}</a></p>
  
  <p>Best regards,<br/>Your Team</p>
</div>
  `);

  const generateBookingLink = async () => {
    if (!leadId) {
      toast({
        title: "Lead ID Required",
        description: "Please enter a lead ID",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      // Test the bookingLink variable generation in a direct way
      const response = await fetch('/api/emails/test-bookinglink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadId,
          formId: formId || undefined,
          html,
          data: {
            name: 'Test User',
            email: 'test@example.com'
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data.html);
      
      toast({
        title: "Success",
        description: "Booking link generated successfully",
      });
    } catch (error) {
      console.error('Error generating booking link:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to generate booking link',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Test Booking Link</title>
      </Head>
      
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Test Booking Link Variable</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Test Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Lead ID</label>
                  <Input 
                    value={leadId} 
                    onChange={(e) => setLeadId(e.target.value)}
                    placeholder="Enter a lead ID" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required. Must be a valid lead ID from the database.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Form ID (Optional)</label>
                  <Input 
                    value={formId} 
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="Enter a booking form ID (optional)" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    If left empty, the system will use the default booking form.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">HTML Template</label>
                  <Textarea 
                    value={html} 
                    onChange={(e) => setHtml(e.target.value)}
                    className="font-mono text-sm h-48" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use {'{{'} bookingLink {'}}'}  where you want the booking link to appear.
                  </p>
                </div>
                
                <Button 
                  onClick={generateBookingLink} 
                  disabled={loading || !leadId}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : 'Generate Booking Link'}
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="border rounded-md p-4">
                    <div dangerouslySetInnerHTML={{ __html: result }} />
                    <hr className="my-4" />
                    <h3 className="text-sm font-medium mb-2">HTML Output:</h3>
                    <pre className="bg-muted p-2 rounded-md overflow-auto text-xs whitespace-pre-wrap">
                      {result}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {loading ? 'Generating...' : 'Generated output will appear here'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
} 