# INSTRUCTIONS FOR AI: IMPLEMENT THESE SCHEMA CHANGES

## IMPORTANT: READ THESE INSTRUCTIONS CAREFULLY

1. This document contains schema changes for a new Form/Email System 2.0.
2. **DO NOT DROP OR MODIFY ANY EXISTING TABLES**. Create only new tables with "2" suffix.
3. Implement these changes as a Prisma migration that ONLY ADDS new tables.
4. After reviewing the schema, create the migration file and apply it to the database.
5. Respond with the migration SQL and confirmation of successful application.

# Schema Changes for Form/Email System 2.0

This document outlines all the necessary database schema changes required to implement the Form System 2.0, Email System 2.0, and Form Analytics System 2.0. These changes should be implemented before beginning local development of the new systems.

## Overview of Changes

The schema changes are organized into three main categories:

1. **Form System 2.0 Schema Changes**
2. **Email System 2.0 Schema Changes**
3. **Form Analytics 2.0 Schema Changes**

## 1. Form System 2.0 Schema Changes

### New Models

```prisma
// Form System 2.0 Models

// Main form model with versioning
model Form2 {
  id                String         @id @default(cuid())
  title             String
  description       String?
  type              String         // INQUIRY, BOOKING, etc.
  version           String         @default("2.0")
  isActive          Boolean        @default(true)
  isPublic          Boolean        @default(false)
  submitButtonText  String?
  successMessage    String?
  userId            String
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  // Relations
  sections          FormSection2[]
  submissions       FormSubmission2[]
  emailRules        EmailRule2[]
  
  // Legacy form ID for migration
  legacyFormId      String?
  
  @@index([userId])
  @@index([type])
  @@index([isActive])
}

// Form sections
model FormSection2 {
  id                String         @id @default(cuid())
  title             String
  description       String?
  order             Int            @default(0)
  formId            String
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  // Relations
  form              Form2          @relation(fields: [formId], references: [id], onDelete: Cascade)
  fields            FormField2[]
  
  // Conditional logic (JSON)
  conditionalLogic  String?        // JSON string
  
  @@index([formId])
  @@index([order])
}

// Form fields
model FormField2 {
  id                String         @id @default(cuid())
  type              String         // text, email, select, etc.
  label             String
  name              String         // Field name for form submission
  placeholder       String?
  helpText          String?
  required          Boolean        @default(false)
  order             Int            @default(0)
  sectionId         String
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  // Relations
  section           FormSection2   @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  
  // Field configuration (JSON)
  config            String         // JSON string with type-specific configuration
  
  // Validation rules (JSON)
  validation        String?        // JSON string
  
  // Conditional logic (JSON)
  conditionalLogic  String?        // JSON string
  
  // Field mapping for email variables
  mapping           String?        // JSON string
  
  // Stable ID for consistent reference
  stableId          String         @unique
  
  // Flag indicating if field is used in email rules
  inUseByRules      Boolean        @default(false)
  
  // Legacy field ID for migration
  legacyFieldId     String?
  
  @@index([sectionId])
  @@index([order])
  @@index([type])
  @@index([stableId])
}

// Form submissions
model FormSubmission2 {
  id                String         @id @default(cuid())
  formId            String
  data              String         // JSON string of form data
  metadata          String?        // JSON string of metadata
  status            String         @default("SUBMITTED") // SUBMITTED, PROCESSED, etc.
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  // Relations
  form              Form2          @relation(fields: [formId], references: [id])
  emailLogs         EmailLog2[]
  
  // Legacy submission ID for migration
  legacySubmissionId String?
  
  @@index([formId])
  @@index([createdAt])
  @@index([status])
}
```

## 2. Email System 2.0 Schema Changes

### New Models

```prisma
// Email System 2.0 Models

// Email templates
model EmailTemplate2 {
  id                String         @id @default(cuid())
  name              String
  description       String?
  type              String         // NOTIFICATION, CONFIRMATION, etc.
  subject           String
  htmlContent       String         @db.Text
  textContent       String?        @db.Text
  userId            String
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  // Relations
  emailRules        EmailRule2[]
  emailLogs         EmailLog2[]
  
  // Legacy template ID for migration
  legacyTemplateId  String?
  
  @@index([userId])
  @@index([type])
}

// Email rules
model EmailRule2 {
  id                String         @id @default(cuid())
  name              String
  description       String?
  formId            String
  templateId        String
  isActive          Boolean        @default(true)
  conditions        String         @db.Text // JSON string of conditions
  recipientType     String         // FORM_EMAIL, SPECIFIC, etc.
  recipientEmail    String?        // For SPECIFIC type
  recipientField    String?        // For FORM_EMAIL type
  ccEmails          String?        // Comma-separated list
  bccEmails         String?        // Comma-separated list
  userId            String
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  // Relations
  form              Form2          @relation(fields: [formId], references: [id])
  template          EmailTemplate2 @relation(fields: [templateId], references: [id])
  emailLogs         EmailLog2[]
  
  // Legacy rule ID for migration
  legacyRuleId      String?
  
  @@index([formId])
  @@index([templateId])
  @@index([userId])
  @@index([isActive])
}

// Email processing logs
model EmailProcessingLog2 {
  id                String         @id @default(cuid())
  level             String         // info, success, warning, error
  message           String
  correlationId     String
  source            String         // form_submission, admin_test, etc.
  formId            String?
  submissionId      String?
  ruleId            String?
  templateId        String?
  timestamp         DateTime
  details           String?        @db.Text // JSON string
  error             String?
  stackTrace        String?        @db.Text
  createdAt         DateTime       @default(now())
  
  @@index([correlationId])
  @@index([submissionId])
  @@index([formId])
  @@index([level])
  @@index([timestamp])
}

// Email queue
model EmailQueue2 {
  id                String         @id @default(cuid())
  templateId        String
  recipient         String
  subject           String
  html              String         @db.Text
  text              String?        @db.Text
  cc                String?
  bcc               String?
  submissionId      String?
  formId            String?
  userId            String?
  ruleId            String?
  correlationId     String
  source            String         // form_submission, admin_test, etc.
  status            String         // queued, sending, sent, failed
  createdAt         DateTime       @default(now())
  sentAt            DateTime?
  error             String?
  metadata          String?        // JSON string
  
  @@index([status])
  @@index([correlationId])
  @@index([createdAt])
}

// Email logs
model EmailLog2 {
  id                String         @id @default(cuid())
  templateId        String
  submissionId      String?
  formId            String?
  ruleId            String?
  recipient         String
  subject           String
  status            String         // SENT, DELIVERED, OPENED, CLICKED, FAILED
  userId            String?
  ccRecipients      String?
  bccRecipients     String?
  error             String?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  // Relations
  template          EmailTemplate2 @relation(fields: [templateId], references: [id])
  submission        FormSubmission2? @relation(fields: [submissionId], references: [id])
  rule              EmailRule2?    @relation(fields: [ruleId], references: [id])
  
  // Tracking data
  trackingId        String?        @unique
  openedAt          DateTime?
  clickedAt         DateTime?
  deliveredAt       DateTime?
  
  @@index([templateId])
  @@index([submissionId])
  @@index([formId])
  @@index([ruleId])
  @@index([status])
  @@index([createdAt])
}
```

## 3. Form Analytics 2.0 Schema Changes

### New Models

```prisma
// Form Analytics 2.0 Models

// Analytics events
model AnalyticsEvent2 {
  id                String         @id
  type              String         // form_view, form_start, etc.
  timestamp         DateTime
  sessionId         String
  userId            String?
  visitorId         String
  formId            String?
  formName          String?
  formType          String?
  fieldId           String?
  fieldName         String?
  sectionId         String?
  sectionName       String?
  submissionId      String?
  emailId           String?
  bookingId         String?
  value             String?        // JSON string
  metadata          String?        // JSON string
  source            String?
  medium            String?
  campaign          String?
  referrer          String?
  userAgent         String?
  ipAddress         String?
  duration          Int?
  previousEventId   String?
  createdAt         DateTime       @default(now())
  
  @@index([sessionId])
  @@index([visitorId])
  @@index([formId])
  @@index([submissionId])
  @@index([emailId])
  @@index([type])
  @@index([timestamp])
}

// Form analytics summary
model FormAnalyticsSummary2 {
  id                String         @id @default(cuid())
  formId            String
  date              DateTime
  views             Int            @default(0)
  starts            Int            @default(0)
  completions       Int            @default(0)
  abandonments      Int            @default(0)
  averageCompletionTime Int?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  @@unique([formId, date])
  @@index([formId])
  @@index([date])
}

// Field analytics summary
model FieldAnalyticsSummary2 {
  id                String         @id @default(cuid())
  formId            String
  fieldId           String
  date              DateTime
  focuses           Int            @default(0)
  blurs             Int            @default(0)
  changes           Int            @default(0)
  errors            Int            @default(0)
  totalTimeSpent    Int            @default(0) // In milliseconds
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  @@unique([formId, fieldId, date])
  @@index([formId])
  @@index([fieldId])
  @@index([date])
}
```

## Migration Strategy

To ensure a smooth transition to the new schema, we'll implement the following migration strategy:

1. **Create New Tables**: Add all new tables with "2" suffix to avoid conflicts with existing tables
2. **Data Migration Scripts**: Create scripts to migrate data from old tables to new tables
3. **Legacy ID References**: Store legacy IDs in new tables for reference during migration
4. **Parallel Operation**: Run both systems in parallel during the transition period
5. **Gradual Cutover**: Migrate forms one by one to the new system

## Implementation Notes

1. **JSON Fields**: Many fields use JSON strings to store structured data. Ensure proper serialization/deserialization in the application code.
2. **Text Fields**: Use `@db.Text` for fields that may contain large amounts of text.
3. **Indexes**: Indexes are added to fields that will be frequently queried to improve performance.
4. **Cascading Deletes**: Use cascading deletes where appropriate to maintain referential integrity.
5. **Unique Constraints**: Add unique constraints to fields that should be unique.

## Next Steps

After implementing these schema changes:

1. Create migration scripts to move data from old tables to new tables
2. Implement the Form System 2.0 core components
3. Implement the Email System 2.0 core components
4. Implement the Form Analytics 2.0 tracking system
5. Develop the UI components for the new systems
