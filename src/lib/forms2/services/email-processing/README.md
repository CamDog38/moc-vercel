# Form System 2.0 Email Processing

This directory contains the email processing system for Form System 2.0, which handles email automations for form submissions.

## Key Components

- **index.ts**: Main export file for the email processing system
- **emailService2.ts**: Main service class for email processing
- **templateService2.ts**: Service for handling email templates
- **ruleService2.ts**: Service for processing email rules
- **variableService2.ts**: Service for replacing variables in email templates
- **sendService2.ts**: Service for sending emails via SendGrid
- **types.ts**: TypeScript interfaces for the email processing system

## Architecture

The email processing system follows these steps:

1. **Rule Processing**: Determine which email rules apply to a form submission
2. **Template Processing**: Fetch and process the email templates
3. **Variable Replacement**: Replace variables in the email templates with data from the form submission
4. **Email Sending**: Send the emails via SendGrid
5. **Logging**: Log all email processing activities

## Important Notes

- This system uses the **original** `EmailRule` and `EmailTemplate` tables, not the Form System 2.0 tables.
- All components have a "2" suffix to indicate they are part of Form System 2.0.
- The system is designed to work with both Form System 1.0 and 2.0 forms.
- The system logs all activities to help with debugging.

## Usage

```typescript
import { processEmailRules2 } from '@/lib/forms2/services/email-processing';

// Process email rules for a form submission
const result = await processEmailRules2({
  formId: 'form-id',
  submissionId: 'submission-id',
  data: formData
});
```
