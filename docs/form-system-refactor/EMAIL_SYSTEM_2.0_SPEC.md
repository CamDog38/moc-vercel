# Email System 2.0 Technical Specification

## Overview

This document outlines the architecture for the new Email System 2.0, which will provide a more robust, traceable, and maintainable system for sending emails based on form submissions. The new system will clearly identify the source of emails and provide better logging and debugging capabilities.

## Directory Structure

```
/components/forms2.0/            # All new form components use 2.0 suffix
  /core/                         # Core form functionality
  /fields/                       # Field components
  /sections/                     # Section components
  /validation/                   # Validation system
  /builder/                      # Form builder UI
  /renderer/                     # Form renderer

/lib/emails2.0/                  # Email system 2.0
  /core/
    emailTypes.ts               # Type definitions
    emailContext.ts             # Email context provider
    emailQueue.ts               # Email queue management
  /processing/
    emailProcessor.ts           # Main email processing logic
    variableReplacer.ts         # Variable replacement system
    conditionEvaluator.ts       # Condition evaluation for rules
  /sending/
    emailSender.ts              # Email sending service
    emailLogger.ts              # Comprehensive email logging
    emailTracker.ts             # Email tracking system
  /templates/
    templateRenderer.ts         # Template rendering system
    templateValidator.ts        # Template validation
  /rules/
    ruleEngine.ts               # Rule evaluation engine
    ruleMapper.ts               # Maps fields to rules
  /debugging/
    debugConsole.ts             # Debug console for email system
    emailInspector.ts           # Tool for inspecting email processing

/pages/api/emails2.0/            # API routes for email system 2.0
  process-submission.ts         # Process form submission
  send-email.ts                 # Send individual email
  debug-email.ts                # Debug email processing
  track-email.ts                # Track email opens/clicks
```

## Core Components

### 1. Email Processing System

The email processing system will be completely rebuilt to provide clear identification of the email source and comprehensive logging.

```typescript
// lib/emails2.0/processing/emailProcessor.ts
import { FormSubmission, EmailRule } from '@prisma/client';
import { EmailProcessingResult, EmailSource } from '../core/emailTypes';
import { evaluateRuleConditions } from '../rules/ruleEngine';
import { processEmailTemplate } from './templateProcessor';
import { queueEmail } from '../core/emailQueue';
import { logEmailProcessing } from '../sending/emailLogger';

/**
 * Process a form submission and send emails based on matching rules
 */
export async function processFormSubmission(
  formId: string,
  submissionId: string,
  formData: Record<string, any>,
  options: {
    userId?: string;
    source: EmailSource; // Clearly identify the source
    correlationId?: string; // For tracking the entire process
    debug?: boolean;
  }
): Promise<EmailProcessingResult> {
  const { userId, source, correlationId = generateCorrelationId(), debug = false } = options;
  
  // Start logging with correlation ID and source
  logEmailProcessing({
    level: 'info',
    message: `Starting email processing for submission ${submissionId}`,
    correlationId,
    source,
    formId,
    submissionId,
    timestamp: new Date(),
    details: { formData }
  });
  
  try {
    // 1. Get the submission from the database
    const submission = await getSubmission(submissionId);
    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }
    
    // 2. Get applicable rules
    const rules = await getEmailRules(formId, userId);
    
    // 3. Process each rule
    const results = await Promise.all(
      rules.map(async (rule) => {
        // Log which rule is being evaluated
        logEmailProcessing({
          level: 'info',
          message: `Evaluating rule ${rule.id}`,
          correlationId,
          source,
          formId,
          submissionId,
          ruleId: rule.id,
          timestamp: new Date()
        });
        
        // Evaluate rule conditions
        const conditionResult = await evaluateRuleConditions(rule, formData, {
          formId,
          logging: debug,
          correlationId,
          source
        });
        
        // Log condition evaluation result
        logEmailProcessing({
          level: 'info',
          message: `Rule ${rule.id} condition evaluation: ${conditionResult.matches ? 'MATCHED' : 'NOT MATCHED'}`,
          correlationId,
          source,
          formId,
          submissionId,
          ruleId: rule.id,
          timestamp: new Date(),
          details: conditionResult
        });
        
        // If conditions match, process the email
        if (conditionResult.matches) {
          return await processMatchingRule(rule, submission, formData, {
            correlationId,
            source,
            debug
          });
        }
        
        return {
          ruleId: rule.id,
          processed: false,
          reason: 'Conditions not met'
        };
      })
    );
    
    // 4. Return the overall result
    const result = {
      submissionId,
      correlationId,
      source,
      timestamp: new Date(),
      results
    };
    
    logEmailProcessing({
      level: 'success',
      message: `Completed email processing for submission ${submissionId}`,
      correlationId,
      source,
      formId,
      submissionId,
      timestamp: new Date(),
      details: result
    });
    
    return result;
  } catch (error) {
    // Log any errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logEmailProcessing({
      level: 'error',
      message: `Error processing emails: ${errorMessage}`,
      correlationId,
      source,
      formId,
      submissionId,
      timestamp: new Date(),
      error: error instanceof Error ? error : new Error(errorMessage)
    });
    
    throw error;
  }
}

/**
 * Process a rule that has matched conditions
 */
async function processMatchingRule(
  rule: EmailRule,
  submission: FormSubmission,
  formData: Record<string, any>,
  options: {
    correlationId: string;
    source: EmailSource;
    debug?: boolean;
  }
): Promise<{
  ruleId: string;
  processed: boolean;
  emailId?: string;
  reason?: string;
}> {
  const { correlationId, source, debug = false } = options;
  
  try {
    // 1. Get the email template
    const template = await getEmailTemplate(rule.templateId);
    if (!template) {
      throw new Error(`Template not found: ${rule.templateId}`);
    }
    
    // 2. Process the template (variable replacement, etc.)
    const processedEmail = await processEmailTemplate(template, formData, submission, {
      correlationId,
      source,
      debug
    });
    
    // 3. Determine recipient
    const recipient = await determineRecipient(rule, formData, submission);
    if (!recipient) {
      return {
        ruleId: rule.id,
        processed: false,
        reason: 'No valid recipient'
      };
    }
    
    // 4. Queue the email for sending
    const emailId = await queueEmail({
      templateId: template.id,
      recipient,
      subject: processedEmail.subject,
      html: processedEmail.html,
      text: processedEmail.text,
      cc: rule.ccEmails,
      bcc: rule.bccEmails,
      submissionId: submission.id,
      formId: submission.formId,
      userId: rule.userId,
      ruleId: rule.id,
      correlationId,
      source,
      metadata: {
        formType: submission.formType,
        ruleName: rule.name
      }
    });
    
    return {
      ruleId: rule.id,
      processed: true,
      emailId
    };
  } catch (error) {
    // Log the error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logEmailProcessing({
      level: 'error',
      message: `Error processing rule ${rule.id}: ${errorMessage}`,
      correlationId,
      source,
      ruleId: rule.id,
      submissionId: submission.id,
      formId: submission.formId,
      timestamp: new Date(),
      error: error instanceof Error ? error : new Error(errorMessage)
    });
    
    return {
      ruleId: rule.id,
      processed: false,
      reason: errorMessage
    };
  }
}
```

### 2. Email Types

```typescript
// lib/emails2.0/core/emailTypes.ts

/**
 * Defines the source of an email to clearly identify where it came from
 */
export type EmailSource = 
  | 'form_submission'           // Regular form submission
  | 'admin_test'                // Admin testing the form
  | 'public_test'               // Public test page
  | 'debug_console'             // Debug console
  | 'manual_send'               // Manually sent by admin
  | 'api'                       // External API call
  | 'scheduled'                 // Scheduled email
  | 'system';                   // System-generated email

/**
 * Email processing log entry
 */
export interface EmailProcessingLog {
  id?: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  correlationId: string;
  source: EmailSource;
  formId?: string;
  submissionId?: string;
  ruleId?: string;
  templateId?: string;
  timestamp: Date;
  details?: any;
  error?: Error;
}

/**
 * Result of email processing
 */
export interface EmailProcessingResult {
  submissionId: string;
  correlationId: string;
  source: EmailSource;
  timestamp: Date;
  results: Array<{
    ruleId: string;
    processed: boolean;
    emailId?: string;
    reason?: string;
  }>;
}

/**
 * Email in the queue
 */
export interface QueuedEmail {
  id: string;
  templateId: string;
  recipient: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string;
  bcc?: string;
  submissionId?: string;
  formId?: string;
  userId?: string;
  ruleId?: string;
  correlationId: string;
  source: EmailSource;
  status: 'queued' | 'sending' | 'sent' | 'failed';
  createdAt: Date;
  sentAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}
```

### 3. Email Logger

```typescript
// lib/emails2.0/sending/emailLogger.ts
import prisma from '@/lib/prisma';
import { EmailProcessingLog } from '../core/emailTypes';

/**
 * Log an email processing event
 */
export async function logEmailProcessing(log: EmailProcessingLog): Promise<void> {
  try {
    // 1. Save to database
    await prisma.emailProcessingLog.create({
      data: {
        level: log.level,
        message: log.message,
        correlationId: log.correlationId,
        source: log.source,
        formId: log.formId,
        submissionId: log.submissionId,
        ruleId: log.ruleId,
        templateId: log.templateId,
        timestamp: log.timestamp,
        details: log.details ? JSON.stringify(log.details) : null,
        error: log.error ? log.error.message : null,
        stackTrace: log.error?.stack || null
      }
    });
    
    // 2. Console log for development
    if (process.env.NODE_ENV !== 'production') {
      const logPrefix = `[Email2.0][${log.correlationId}][${log.source}]`;
      
      switch (log.level) {
        case 'info':
          console.info(`${logPrefix} ${log.message}`);
          break;
        case 'success':
          console.log(`${logPrefix} ✅ ${log.message}`);
          break;
        case 'warning':
          console.warn(`${logPrefix} ⚠️ ${log.message}`);
          break;
        case 'error':
          console.error(`${logPrefix} ❌ ${log.message}`);
          if (log.error?.stack) {
            console.error(log.error.stack);
          }
          break;
      }
    }
    
    // 3. Write to log file if configured
    if (process.env.EMAIL_LOG_FILE) {
      // Implement file logging
    }
  } catch (error) {
    // Fallback logging if database logging fails
    console.error('[Email2.0] Failed to log email processing:', error);
    console.error('Original log:', log);
  }
}

/**
 * Get email processing logs for a specific correlation ID
 */
export async function getEmailProcessingLogs(correlationId: string): Promise<EmailProcessingLog[]> {
  const logs = await prisma.emailProcessingLog.findMany({
    where: { correlationId },
    orderBy: { timestamp: 'asc' }
  });
  
  return logs.map(log => ({
    id: log.id,
    level: log.level as 'info' | 'success' | 'warning' | 'error',
    message: log.message,
    correlationId: log.correlationId,
    source: log.source as any,
    formId: log.formId || undefined,
    submissionId: log.submissionId || undefined,
    ruleId: log.ruleId || undefined,
    templateId: log.templateId || undefined,
    timestamp: log.timestamp,
    details: log.details ? JSON.parse(log.details) : undefined,
    error: log.error ? new Error(log.error) : undefined
  }));
}
```

### 4. Debug Console

```typescript
// lib/emails2.0/debugging/debugConsole.ts
import { EmailSource } from '../core/emailTypes';
import { processFormSubmission } from '../processing/emailProcessor';
import { getEmailProcessingLogs } from '../sending/emailLogger';

/**
 * Test email processing with a form submission
 */
export async function testEmailProcessing(
  formId: string,
  formData: Record<string, any>,
  options: {
    userId?: string;
    submissionId?: string;
    source?: EmailSource;
    debug?: boolean;
  } = {}
): Promise<{
  result: any;
  logs: any[];
}> {
  const {
    userId,
    submissionId = `test_${Date.now()}`,
    source = 'debug_console',
    debug = true
  } = options;
  
  try {
    // 1. Process the submission
    const result = await processFormSubmission(
      formId,
      submissionId,
      formData,
      {
        userId,
        source,
        debug,
        correlationId: `debug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      }
    );
    
    // 2. Get the logs
    const logs = await getEmailProcessingLogs(result.correlationId);
    
    // 3. Return both the result and logs
    return {
      result,
      logs
    };
  } catch (error) {
    // Return the error and any logs that were generated
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const correlationId = (error as any).correlationId || `error_${Date.now()}`;
    
    const logs = await getEmailProcessingLogs(correlationId);
    
    return {
      result: {
        error: errorMessage,
        correlationId
      },
      logs
    };
  }
}

/**
 * Test sending a specific email template
 */
export async function testEmailTemplate(
  templateId: string,
  recipient: string,
  data: Record<string, any>,
  options: {
    userId?: string;
    cc?: string;
    bcc?: string;
    debug?: boolean;
  } = {}
): Promise<{
  result: any;
  logs: any[];
}> {
  // Implementation similar to testEmailProcessing
  // but focused on testing a specific template
}
```

## API Routes

### 1. Process Form Submission

```typescript
// pages/api/emails2.0/process-submission.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { processFormSubmission } from '@/lib/emails2.0/processing/emailProcessor';
import { createClient } from '@/lib/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // 1. Authenticate the request
    const supabase = createClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user && !isInternalRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // 2. Extract parameters
    const { formId, submissionId, formData, source = 'api' } = req.body;
    
    if (!formId || !submissionId || !formData) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // 3. Process the submission
    const result = await processFormSubmission(
      formId,
      submissionId,
      formData,
      {
        userId: user?.id,
        source: source as any,
        correlationId: req.headers['x-correlation-id'] as string || undefined
      }
    );
    
    // 4. Return the result
    return res.status(200).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: errorMessage });
  }
}

// Helper to check if this is an internal server-to-server request
function isInternalRequest(req: NextApiRequest): boolean {
  const apiKey = req.headers['x-api-key'];
  return apiKey === process.env.INTERNAL_API_KEY;
}
```

### 2. Debug Email API

```typescript
// pages/api/emails2.0/debug-email.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { testEmailProcessing, testEmailTemplate } from '@/lib/emails2.0/debugging/debugConsole';
import { createClient } from '@/lib/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // 1. Authenticate the request
    const supabase = createClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Only allow authenticated users or local development
    if (!user && process.env.NODE_ENV !== 'development') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // 2. Extract parameters
    const { action, formId, templateId, recipient, data } = req.body;
    
    // 3. Perform the requested action
    switch (action) {
      case 'test_processing':
        if (!formId || !data) {
          return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        const processingResult = await testEmailProcessing(formId, data, {
          userId: user?.id,
          source: 'debug_console'
        });
        
        return res.status(200).json(processingResult);
        
      case 'test_template':
        if (!templateId || !recipient || !data) {
          return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        const templateResult = await testEmailTemplate(templateId, recipient, data, {
          userId: user?.id
        });
        
        return res.status(200).json(templateResult);
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: errorMessage });
  }
}
```

## Database Schema Updates

```prisma
// prisma/schema.prisma (additions)

// Email Processing Logs
model EmailProcessingLog {
  id            String   @id @default(cuid())
  level         String   // info, success, warning, error
  message       String
  correlationId String
  source        String
  formId        String?
  submissionId  String?
  ruleId        String?
  templateId    String?
  timestamp     DateTime
  details       String?  // JSON string
  error         String?
  stackTrace    String?
  
  createdAt     DateTime @default(now())
  
  @@index([correlationId])
  @@index([submissionId])
  @@index([formId])
}

// Email Queue
model EmailQueue {
  id            String   @id @default(cuid())
  templateId    String
  recipient     String
  subject       String
  html          String   @db.Text
  text          String?  @db.Text
  cc            String?
  bcc           String?
  submissionId  String?
  formId        String?
  userId        String?
  ruleId        String?
  correlationId String
  source        String
  status        String   // queued, sending, sent, failed
  createdAt     DateTime @default(now())
  sentAt        DateTime?
  error         String?
  metadata      String?  // JSON string
  
  @@index([status])
  @@index([correlationId])
}
```

## Integration with Form System 2.0

The Email System 2.0 will integrate with the Form System 2.0 through a clear interface:

```typescript
// components/forms2.0/core/types.ts

export interface FormSubmissionHandlers {
  onSubmit?: (data: FormSubmissionData) => void | Promise<void>;
  onSubmitSuccess?: (result: any) => void;
  onSubmitError?: (error: Error) => void;
}

export interface FormSubmissionData {
  formId: string;
  values: Record<string, any>;
  metadata?: Record<string, any>;
}

// components/forms2.0/renderer/FormRenderer.tsx

export function FormRenderer2({ form, handlers }: FormRendererProps) {
  // ...form rendering logic...
  
  const handleSubmit = async (values: Record<string, any>) => {
    try {
      // 1. Create submission in database
      const submission = await createFormSubmission(form.id, values);
      
      // 2. Process emails with clear source identification
      await fetch('/api/emails2.0/process-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: form.id,
          submissionId: submission.id,
          formData: values,
          source: 'form_submission'
        }),
      });
      
      // 3. Call onSubmitSuccess handler
      if (handlers?.onSubmitSuccess) {
        handlers.onSubmitSuccess(submission);
      }
    } catch (error) {
      // Handle error
      if (handlers?.onSubmitError) {
        handlers.onSubmitError(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  };
  
  // ...rest of component...
}
```

## Debug UI

The system will include a comprehensive debug UI for testing and troubleshooting:

```typescript
// components/emails2.0/DebugConsole.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { testEmailProcessing, testEmailTemplate } from '@/lib/emails2.0/debugging/debugConsole';

export function EmailDebugConsole2({ formId, userId }: { formId: string; userId?: string }) {
  const [activeTab, setActiveTab] = useState('test_processing');
  const [formData, setFormData] = useState({});
  const [recipient, setRecipient] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleTestProcessing = async () => {
    setIsLoading(true);
    try {
      const { result, logs } = await testEmailProcessing(formId, formData, {
        userId,
        source: 'debug_console'
      });
      setResult(result);
      setLogs(logs);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTestTemplate = async () => {
    setIsLoading(true);
    try {
      const { result, logs } = await testEmailTemplate(templateId, recipient, formData, {
        userId
      });
      setResult(result);
      setLogs(logs);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email System 2.0 Debug Console</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="test_processing">Test Email Processing</TabsTrigger>
            <TabsTrigger value="test_template">Test Email Template</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="test_processing">
            {/* Form for testing email processing */}
            <Button onClick={handleTestProcessing} disabled={isLoading}>
              {isLoading ? 'Testing...' : 'Test Email Processing'}
            </Button>
          </TabsContent>
          
          <TabsContent value="test_template">
            {/* Form for testing email template */}
            <Button onClick={handleTestTemplate} disabled={isLoading}>
              {isLoading ? 'Testing...' : 'Test Email Template'}
            </Button>
          </TabsContent>
          
          <TabsContent value="logs">
            {/* Display logs */}
            {logs.map((log, index) => (
              <div key={index} className={`log-entry log-${log.level}`}>
                <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="log-level">{log.level.toUpperCase()}</span>
                <span className="log-message">{log.message}</span>
                {log.details && (
                  <pre className="log-details">{JSON.stringify(log.details, null, 2)}</pre>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>
        
        {result && (
          <div className="mt-4">
            <h3>Result</h3>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## Conclusion

The Email System 2.0 provides a complete rebuild of the email processing and sending functionality with these key improvements:

1. **Clear Source Identification**: Every email is tagged with its source (form submission, test, debug, etc.)
2. **Comprehensive Logging**: Detailed logs for every step of the email processing
3. **Correlation IDs**: Track the entire email processing flow with correlation IDs
4. **Debug Tools**: Built-in tools for testing and troubleshooting
5. **Improved Error Handling**: Better error reporting and recovery
6. **Queue System**: Reliable email sending with a queue system

This system will integrate seamlessly with the Form System 2.0 while providing a clear upgrade path from the existing email system.
