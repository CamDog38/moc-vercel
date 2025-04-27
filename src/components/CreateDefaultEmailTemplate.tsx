import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface CreateDefaultEmailTemplateProps {
  formId: string;
  formType: string;
  onSuccess?: () => void;
}

export default function CreateDefaultEmailTemplate({
  formId,
  formType,
  onSuccess
}: CreateDefaultEmailTemplateProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const createDefaultTemplate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/emails/create-default-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId,
          formType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create default template');
      }

      if (data.created) {
        setSuccess('Default email template and rule created successfully!');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setSuccess('This form already has email rules. No default template was created.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        onClick={createDefaultTemplate} 
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Default Template...
          </>
        ) : (
          'Create Default Email Template'
        )}
      </Button>
      
      <p className="text-sm text-muted-foreground">
        This will create a default email template and rule for this form that will automatically send an email to users when they submit the form.
      </p>
    </div>
  );
}