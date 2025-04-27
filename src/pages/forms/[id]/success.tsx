import { useRouter } from 'next/router';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import EmailRuleDebugger from '@/components/EmailRuleDebugger';

export default function FormSuccess() {
  const router = useRouter();
  const { bookingId, leadId, submissionId } = router.query;
  const [showDebugger] = useState(false);
  const submissionType = bookingId ? 'booking' : leadId ? 'lead' : null;

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Thank You!</CardTitle>
          <CardDescription className="text-center text-lg">
            {submissionType === 'booking' 
              ? 'Your booking has been successfully submitted.' 
              : 'Your inquiry has been successfully submitted.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-center">
              {submissionType === 'booking' 
                ? 'We have received your booking request and will be in touch shortly.' 
                : 'We have received your inquiry and will get back to you as soon as possible.'}
            </p>
            
            {process.env.NEXT_PUBLIC_CO_DEV_ENV && showDebugger && submissionId && (
              <div className="mt-8">
                <EmailRuleDebugger submissionId={submissionId as string} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}