# Email Processing System Documentation

## Overview

This directory contains utilities and functions for processing emails in both Form System 1.0 and Form System 2.0. The email processing system is responsible for evaluating email rules, processing form submissions, and sending emails based on form data.

## Architecture

The email processing system consists of two main paths:

### Form System 1.0 (Legacy)

1. **Form Submission Entry Point**: `/forms/[id]/view.tsx`
   - User submits a form through the form view page
   - The `handleSubmit` function processes the submission
   - Makes a POST request to either `/api/leads` or `/api/bookings` depending on form type

2. **API Endpoint Processing**: `/api/leads/index.ts` or `/api/bookings/index.ts`
   - Creates a lead/booking record in the database
   - Creates a form submission record
   - Makes a POST request to `/api/emails/process-submission` with form data and submission ID
   - Uses a 30-second timeout (increased from 10 seconds to prevent timeout errors)

3. **Email Processing API**: `/api/emails/process-submission.ts`
   - Fetches form details and email rules
   - Processes form data and evaluates conditions
   - For each matching rule:
     - Determines the recipient email
     - Gets CC/BCC emails from both the rule and template
     - Calls `processEmailAsync` with these parameters

4. **Email Processing Function**: `processEmailAsync` in `/api/emails/process-async.ts`
   - Handles variable replacement
   - Sends the email using the email sender utility

### Form System 2.0

1. **Form Submission**: From Form System 2.0 interfaces
   - Makes a POST request to an API endpoint that creates form submissions

2. **API Processing**: Various API endpoints (like `/api/forms2/[id]/submissions.ts`)
   - Creates database records
   - Makes a POST request to `/api/emails2/process-submission`

3. **Email Processing**: `/api/emails2/process-submission.ts`
   - Uses the `EmailProcessor` class from `@/lib/emails2/emailProcessor`
   - The `EmailProcessor` class handles all the email processing logic
   - Checks both the rule and template for CC/BCC emails

## Key Components

### Utility Functions

- **`processCcEmailsWithTemplate`**: Processes CC email addresses from both rules and templates
- **`processBccEmailsWithTemplate`**: Processes BCC email addresses from both rules and templates
- **`replaceVariables`**: Replaces variables in email templates with actual values from form data
- **`evaluateConditions`**: Evaluates conditions for email rules to determine if an email should be sent

### API Endpoints

- **`/api/emails/process-submission`**: Processes form submissions for Form System 1.0
- **`/api/emails/process-async`**: Handles asynchronous email processing for Form System 1.0
- **`/api/emails2/process-submission`**: Processes form submissions for Form System 2.0

### Classes

- **`EmailProcessor`**: Handles email rule evaluation and processing for Form System 2.0

## Recent Changes

1. **CC/BCC Handling Improvements**:
   - Modified both systems to check for CC/BCC recipients in both the email rule and the email template
   - Added detailed logging for CC/BCC email processing
   - Fixed TypeScript errors related to null vs undefined type issues

2. **Timeout Improvements**:
   - Increased the timeout for email processing API calls from 10 seconds to 30 seconds
   - This prevents timeout errors when processing complex email rules

3. **Logging Enhancements**:
   - Added comprehensive logging throughout the email processing flow
   - Logs now show detailed information about CC/BCC recipients, variable replacement, and rule evaluation

## Testing

To test the email processing system:

1. Use the public test page at `/debug/forms/[id]/test-public`
2. This page allows you to test all aspects of the email processing functionality without requiring authentication
3. You can test:
   - Form Submission
   - Email Processing
   - Direct Email Sending

## Troubleshooting

If emails are not being sent correctly:

1. Check the server logs for detailed information about the email processing flow
2. Verify that CC/BCC recipients are correctly retrieved from both rules and templates
3. Ensure that the correct API endpoint is being called based on the form system version
4. Check for timeout errors in the logs

## Future Improvements

1. **Refactor for Consistency**: Consider refactoring the email processing logic to use a shared utility for both Form System 1.0 and 2.0
2. **Improved Error Handling**: Add more robust error handling and recovery mechanisms
3. **Performance Optimization**: Optimize the email processing flow to reduce processing time and prevent timeouts
4. **Better Logging**: Enhance logging to provide more detailed information about the email processing flow
