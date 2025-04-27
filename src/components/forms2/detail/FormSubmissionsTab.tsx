/**
 * Form Submissions Tab Component
 * 
 * This component displays the form submissions overview.
 */

import React from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';
import { useFormDetail } from './FormDetailContext';

export default function FormSubmissionsTab() {
  const router = useRouter();
  const { form } = useFormDetail();
  const { id } = router.query;

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium">Form Submissions</h3>
          <Separator className="my-4" />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <p className="text-sm text-muted-foreground">
            View and manage submissions for this form.
          </p>
          <Button 
            onClick={() => router.push(`/dashboard/forms2/${id}/submissions`)}
          >
            View All Submissions
          </Button>
        </div>
        
        {form && (form as any).submissionCount > 0 ? (
          <p className="text-sm">
            This form has {(form as any).submissionCount} submissions.
          </p>
        ) : (
          <Alert className="bg-blue-50 text-blue-800 border-blue-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Submissions</AlertTitle>
            <AlertDescription>No submissions yet for this form.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
