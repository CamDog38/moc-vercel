# Database Migration History

This document provides an overview of all database migrations in the project and documents a database restore event that occurred after a failed migration.

## Migration Timeline

### Core Structure Migrations (February 2025)

1. **20250213000001_add_sample_bookings**
   - Created `Booking` table with fields: `id`, `date`, `time`, `location`, `status`, `email`, `phone`, `name`, `notes`, `assignedUserId`, `formId`, `createdAt`, `updatedAt`, `confirmationEmailSent`, `confirmationEmailSentAt`
   - Added relationships to `User` and `Form` tables

2. **20250214000001_add_sections_and_multipage**
   - Added `isMultiPage` boolean field to `Form` table
   - Added `sections` JSON field to `Form` table to store section structure

3. **20250215000001_add_form_sections_and_fields**
   - Created `FormSection` table with fields: `id`, `formId`, `title`, `description`, `order`, `isPage`, `createdAt`, `updatedAt`
   - Created `FormField` table with fields: `id`, `sectionId`, `type`, `label`, `placeholder`, `helpText`, `required`, `options`, `validation`, `order`, `createdAt`, `updatedAt`
   - Set up relationships between `Form`, `FormSection`, and `FormField` tables

4. **20250217000001_add_exclude_time**
   - Added `excludeTime` boolean field to `FormField` table
   - Default value set to `false`

5. **20250218000001_add_field_mapping**
   - Added `mapping` string field to `FormField` table
   - Enables fields to be mapped to standard data types like name, email, phone, etc.

### Invoicing and Officers (February 2025)

6. **20250224000001_add_invoices**
   - Created `Invoice` table with fields: `id`, `bookingId`, `status`, `createdAt`, `updatedAt`, `serviceRate`, `serviceType`, `totalAmount`, `travelCosts`
   - Added one-to-one relationship between `Booking` and `Invoice`

7. **20250224000002_update_invoice_model**
   - Added `officerId` field to `Invoice` table
   - Added `dueDate` DateTime field to `Invoice`
   - Added `emailSent` and `emailSentAt` fields to track invoice email status

8. **20250224000003_add_invoice_fields**
   - Added `invoiceNumber` string field to `Invoice` table
   - Added `userId` field to link invoices to users
   - Enhanced cascade deletion behaviors

9. **20250225000001_add_marriage_officers**
   - Created `MarriageOfficer` table with fields: `id`, `userId`, `title`, `firstName`, `lastName`, `phoneNumber`, `address`, `isActive`, `createdAt`, `updatedAt`, `initials`
   - Created `ServiceRate` table with fields: `id`, `officerId`, `serviceType`, `baseRate`, `travelRatePerKm`, `createdAt`, `updatedAt`
   - Added one-to-one relationship with `User` table

10. **20250227000001_add_officer_to_invoice**
    - Added relationship between `Invoice` and `MarriageOfficer` tables
    - Set up appropriate indexes and constraints

### Integration and Template Features (March 2025)

11. **20250227000002_add_zapier_webhooks**
    - Created `ZapierWebhook` table with fields: `id`, `name`, `url`, `description`, `isActive`, `createdAt`, `updatedAt`
    - Set up webhooks for external integrations

12. **20250306000001_add_pdf_templates**
    - Created `PdfTemplate` table with fields: `id`, `name`, `description`, `type`, `content`, `isActive`, `createdAt`, `updatedAt`
    - Added `PdfTemplateType` enum with values: `INVOICE`, `CERTIFICATE`, `AGREEMENT`, `OTHER`

13. **20250306000002_add_webhook_variables**
    - Added `variables` JSON field to `ZapierWebhook` table
    - Default value set to empty JSON object `{}`

14. **20250307000001_add_email_management**
    - Created `EmailTemplate` table with fields: `id`, `name`, `subject`, `htmlContent`, `textContent`, `isActive`, `userId`, `createdAt`, `updatedAt`, `type`
    - Created `EmailRule` table with fields: `id`, `name`, `formId`, `templateId`, `conditions`, `active`, `userId`, `createdAt`, `updatedAt`
    - Created `EmailLog` table with fields: `id`, `templateId`, `userId`, `to`, `subject`, `htmlContent`, `textContent`, `status`, `error`, `createdAt`, `updatedAt`, `formSubmissionId`, `bookingId`, `invoiceId`
    - Set up relationships between these tables and existing models

15. **20250308000001_add_email_rule_evaluation**
    - Created `EmailRuleEvaluation` table with fields: `id`, `ruleId`, `submissionId`, `matches`, `details`, `createdAt`
    - Added relationship to `FormSubmission` and `EmailRule` tables

16. **20250308000002_update_email_rule_conditions_to_json**
    - Modified `conditions` field in `EmailRule` table from string to JSON type
    - Updated existing data to convert string conditions to JSON format

17. **20250311000001_add_invoice_line_items**
    - Created `InvoiceLineItem` table with fields: `id`, `invoiceId`, `description`, `quantity`, `unitPrice`, `amount`, `createdAt`, `updatedAt`
    - Added relationship to `Invoice` table with cascade deletion

18. **20250314000001_add_invoice_numbering**
    - Modified `invoiceNumber` field in `Invoice` table
    - Added indexing for faster lookup
    - Added validation for invoice number format

19. **20250317000001_add_payment_details**
    - Added `amountPaid` Decimal field to `Invoice` table
    - Added `paymentDate` DateTime field to `Invoice` table
    - Added `paymentMethod` string field to `Invoice` table

### Email and Template Enhancements (Late March 2025)

20. **20250325000001_add_email_template_folders**
    - Added `folderId` field to `EmailTemplate` table
    - Added `folder` string field to group templates
    - Created indexes for folder-based querying

21. **20250325000002_add_form_field_conditions**
    - Added `conditionalLogic` JSON field to `FormField` table
    - Enables conditional display logic for form fields

22. **20250327000001_add_email_rule_folders**
    - Added `folder` string field to `EmailRule` table
    - Added filtering capabilities for rule organization

23. **20250328000001_add_background_jobs**
    - Created `BackgroundJob` table with fields: `id`, `type`, `status`, `data`, `result`, `error`, `createdAt`, `updatedAt`, `startedAt`, `completedAt`, `priority`
    - Added `BackgroundJobType` enum with values for different job types

24. **20250329000001_add_cc_bcc_to_email_templates**
    - Added `ccEmails` string field to `EmailTemplate` table
    - Added `bccEmails` string field to `EmailTemplate` table
    - Enhanced email routing capabilities

### Email System Improvements (April 2025)

25. **20250402000001_add_cc_bcc_to_email_logs**
    - Added `cc` string field to `EmailLog` table
    - Added `bcc` string field to `EmailLog` table
    - Improved email delivery auditing

26. **20250402000002_add_recipient_fields_to_email_rules**
    - Added `recipientType` string field to `EmailRule` table
    - Added `recipientEmail` string field to `EmailRule` table
    - Added `recipientField` string field to `EmailRule` table
    - Added `ccEmails` and `bccEmails` string fields to `EmailRule` table

27. **20250404000001_add_debug_logs**
    - Created `DebugLog` table with fields: `id`, `type`, `data`, `createdAt`
    - Added indexes for efficient querying

28. **20250405000001_add_tracking_token**
    - Added `trackingToken` string field to `FormSubmission` table
    - Added `sourceLeadId` string field to `FormSubmission` table
    - Created indexes for these fields

29. **20250406000001_add_timestamp_to_form_submission**
    - Added `timeStamp` string field to `FormSubmission` table
    - Created index for timestamp-based querying

30. **20250407000001_add_email_delay_setting**
    - Added `sendAt` DateTime field to `EmailLog` table
    - Added `delay` integer field to `EmailRule` table
    - Added `delayUnit` string field to `EmailRule` table

31. **20250408000001_add_email_processing_job_type**
    - Added 'EMAIL_PROCESSING' to `BackgroundJobType` enum
    - Enhanced job tracking for email delivery

32. **20250411000001_add_form_sessions**
    - Created `FormSession` table with fields: `id`, `formId`, `data`, `createdAt`, `updatedAt`, `expiresAt`, `token`, `completed`, `submissionId`, `ip`, `userAgent`, `referrer`, `currentStep`, `totalSteps`
    - Added relationships to `Form` and `FormSubmission` tables
    - Created indexes for efficient querying

33. **20250412000001_add_stable_field_id**
    - Added `stableId` TEXT field to `FormField` table, populated with UUID values
    - Added `inUseByRules` BOOLEAN field to `FormField` table (default: false)
    - Created UNIQUE INDEX on `stableId` to ensure uniqueness
    - Created INDEX on `stableId` for faster lookups
    - **[This migration caused issues during deployment]**

## Database Restore Event

On May 14, 2025, we encountered an issue with the migration `20250412000001_add_stable_field_id` during deployment to our Supabase instance (db.yoqvvanbajywjiynmczx.supabase.co). The migration timed out, likely due to the multiple operations it performs:

1. Adding the `stableId` column to the `FormField` table
2. Generating UUID values for all existing records with `gen_random_uuid()::text`
3. Making the column required with `ALTER COLUMN "stableId" SET NOT NULL`
4. Adding unique constraints and indexes:
   - `CREATE UNIQUE INDEX "FormField_stableId_key" ON "FormField"("stableId")`
   - `CREATE INDEX "FormField_stableId_idx" ON "FormField"("stableId")`

After the migration failure, we performed a database restore to ensure data integrity. Post-restore, we observed that the schema changes from the problematic migration were already present in the database, suggesting they had been partially applied before the timeout occurred. Specifically, the `FormField` table now includes both the `stableId` and `inUseByRules` columns, which are functioning correctly.

## Current Status

- The database schema is currently up-to-date with all migrations
- All tables and fields, including the `stableId` and `inUseByRules` fields in the `FormField` table, are present and working correctly
- The `_prisma_migrations` table may still show some migrations as not applied, despite the schema being correct
- For future deployments, we've implemented `PRISMA_SKIP_MIGRATIONS=true` to prevent timeouts

## Recommendations

1. For deployments, maintain the `PRISMA_SKIP_MIGRATIONS=true` setting to avoid migration timeouts
2. For future migrations, split complex operations into multiple smaller migrations
3. For operations on large tables, consider batching updates rather than single UPDATE statements
4. Always verify database schema after deployments to ensure consistency

## Backup

A backup of all migrations is maintained at `~/prisma_migrations_backup/` for reference and recovery purposes if needed. 