import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BookingSuccess() {
  const router = useRouter();
  const { id } = router.query;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Fetching booking details for ID:', id);
      }
      fetch(`/api/bookings/${id}`, {
        headers: {
          'x-public-context': 'true'
        }
      })
        .then(response => {
          if (!response.ok) {
            return response.json().then(data => {
              throw new Error(data.error || 'Failed to fetch booking details');
            });
          }
          return response.json();
        })
        .then(booking => {
          if (booking && booking.formId) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('Redirecting to form success page:', booking.formId);
            }
            router.replace(`/forms/${booking.formId}/success?bookingId=${id}`);
          } else {
            setError('Booking information is incomplete');
            setLoading(false);
          }
        })
        .catch(error => {
          console.error('Error fetching booking:', error);
          setError(error.message);
          setLoading(false);
        });
    }
  }, [id, router]);

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Booking Received!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <p className="text-center">
                Thank you for your booking. We have received your request and will process it shortly.
              </p>
              {loading && (
                <p className="text-sm text-gray-500 text-center">Loading booking details...</p>
              )}
            </>
          )}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
            >
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}