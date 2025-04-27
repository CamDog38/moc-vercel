import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface EmailErrorDisplayProps {
  error: any;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const EmailErrorDisplay: React.FC<EmailErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  onDismiss 
}) => {
  // Extract error details
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message || error?.error || 'An unknown error occurred';
  
  const errorDetails = error?.details || error?.data;
  const errorStatus = error?.status;
  
  // Check if it's a 404 error
  const is404Error = errorStatus === 404;
  
  // Check if it's an authentication error
  const isAuthError = errorStatus === 401 || errorStatus === 403 || 
    errorMessage.toLowerCase().includes('unauthorized') || 
    errorMessage.toLowerCase().includes('authentication');

  // Check if it's a SendGrid API error
  const isSendGridError = errorMessage.toLowerCase().includes('sendgrid') || 
    (errorDetails && JSON.stringify(errorDetails).toLowerCase().includes('sendgrid'));

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-700">
          {is404Error ? 'Resource Not Found' : 
           isAuthError ? 'Authentication Error' :
           isSendGridError ? 'Email Service Error' : 'Email Error'}
        </CardTitle>
        <CardDescription className="text-red-600">
          {is404Error ? 'The requested resource could not be found.' :
           isAuthError ? 'There was a problem with authentication.' :
           isSendGridError ? 'There was a problem with the email service.' : 'There was a problem sending the email.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertTitle>Error Details</AlertTitle>
          <AlertDescription className="mt-2">
            {errorMessage}
            
            {errorStatus && (
              <div className="mt-2">
                <strong>Status:</strong> {errorStatus}
              </div>
            )}
            
            {errorDetails && (
              <Accordion type="single" collapsible className="mt-4">
                <AccordionItem value="details">
                  <AccordionTrigger>Technical Details</AccordionTrigger>
                  <AccordionContent>
                    <pre className="bg-red-100 p-3 rounded text-xs overflow-auto max-h-40">
                      {typeof errorDetails === 'string' 
                        ? errorDetails 
                        : JSON.stringify(errorDetails, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </AlertDescription>
        </Alert>
        
        {is404Error && (
          <div className="mt-4 text-sm text-red-600">
            <p><strong>Possible solutions:</strong></p>
            <ul className="list-disc pl-5 mt-2">
              <li>Check if the URL or resource identifier is correct</li>
              <li>Verify that the resource hasn't been deleted or moved</li>
              <li>Contact your administrator if the problem persists</li>
            </ul>
          </div>
        )}
        
        {isAuthError && (
          <div className="mt-4 text-sm text-red-600">
            <p><strong>Possible solutions:</strong></p>
            <ul className="list-disc pl-5 mt-2">
              <li>Try logging out and logging back in</li>
              <li>Check if your session has expired</li>
              <li>Verify that you have the necessary permissions</li>
              <li>Contact your administrator if the problem persists</li>
            </ul>
          </div>
        )}
        
        {isSendGridError && (
          <div className="mt-4 text-sm text-red-600">
            <p><strong>Possible solutions:</strong></p>
            <ul className="list-disc pl-5 mt-2">
              <li>Verify that your SendGrid API key is valid and has the necessary permissions</li>
              <li>Check if you've reached your email sending limits</li>
              <li>Ensure the recipient email address is valid</li>
              <li>Contact your administrator if the problem persists</li>
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {onDismiss && (
          <Button variant="outline" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
        {onRetry && (
          <Button variant="default" onClick={onRetry}>
            Retry
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default EmailErrorDisplay;