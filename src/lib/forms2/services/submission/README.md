# Form System 2.0 Submission Services

This directory contains the modular services for handling form submissions in the Form System 2.0.

## Overview

The submission services have been refactored to improve maintainability, testability, and separation of concerns. The system now follows a more modular approach with dedicated services for different aspects of form submission processing. This architecture ensures robust validation, error handling, and data integrity throughout the submission process.

## Service Structure

- **submissionService.ts**: Main service that orchestrates the entire submission process
- **validationService.ts**: Handles validation of form fields and submission data
- **leadService.ts**: Creates leads from form submissions
- **bookingService.ts**: Creates bookings from form submissions
- **errorHandlingService.ts**: Provides standardized error handling for the API

The system also uses the mapping module from `@/lib/forms2/services/mapping` which provides advanced field mapping functionality.

## Key Features

### Validation

- Comprehensive field validation based on field configuration
- Type-specific validation with enhanced support for:
  - Email validation with proper format checking
  - Phone number validation with international format support
  - Date validation with future date checking
  - Time validation in both 12-hour and 24-hour formats
  - Full name validation (requires first and last name)
  - Number range validation
  - Text length validation
- Required field validation with custom error messages
- Conditional validation based on field dependencies
- Support for custom validation rules and functions

### Field Mapping

The system uses a modular, strategy-based approach to map form fields to standardized names via the `@/lib/forms2/services/mapping` module:

1. Explicit mapping strategy (using JSON mapping configuration)
2. Field type-based mapping strategy
3. Field label-based mapping strategy
4. Field ID-based mapping strategy
5. Value pattern-based mapping strategy

The mapping module also includes a dedicated contact information extractor that can identify email addresses, names, and phone numbers from raw form data when standard mapping fails.

### Lead and Booking Creation

- Creates leads for inquiry forms
- Creates bookings for booking forms
- Validates required fields (email, name, phone)
- Performs format validation for emails and phone numbers
- Sets default statuses (NEW for leads, PENDING for bookings)

### Error Handling

- Granular error responses
- Detailed logging
- Environment-specific error messages
- Support for different error types:
  - Validation errors
  - Resource not found errors
  - Permission errors
  - Database constraint violations

### Email Processing

- Automatically triggers email processing after form submission
- Handles errors gracefully without failing the submission
- Uses environment-aware base URLs

## Usage

The submission services are used by the form submission API endpoint at `/api/forms2/public/[id]/submit2.ts`. The API endpoint delegates most of the processing logic to these services, making it more maintainable and easier to test.

### Example Usage

```typescript
// In API endpoint
import { submissionService } from '@/lib/forms2/services/submission';

export default async function handler(req, res) {
  try {
    const { id } = req.query; // Form ID
    const formData = req.body; // Form submission data
    const trackingToken = req.cookies.tracking_token;
    const timeStamp = new Date().toISOString();
    
    // Process the submission using the submission service
    const result = await submissionService.processSubmission(
      id,
      formData,
      trackingToken,
      timeStamp
    );
    
    // Return the result
    return res.status(200).json(result);
  } catch (error) {
    // Handle errors
    const errorResponse = errorHandlingService.handleError(error);
    return res.status(errorResponse.statusCode).json(errorResponse);
  }
}
```

### Testing

A test script is provided at `test.ts` that can be used to test the submission services. Run it with:

```bash
npx ts-node src/lib/forms2/services/submission/test.ts
```

## Error Types

The system defines the following error types:

- `VALIDATION_ERROR`: Field validation failures
  - Includes detailed field-specific error messages
  - Provides validation context for debugging
- `NOT_FOUND_ERROR`: Requested resource not found
  - Includes the resource type and ID that wasn't found
- `PERMISSION_ERROR`: User doesn't have permission
  - Specifies the required permission and resource
- `DATABASE_ERROR`: Database constraint violations
  - Sanitizes error messages to avoid exposing sensitive information
- `SERVER_ERROR`: Unexpected server errors
  - Includes error ID for tracking in logs
  - Provides generic message to end users

## Email Processing Integration

The submission system is integrated with the email processing API to automatically trigger email automations after form submission. This integration:

1. Creates the form submission record first
2. Processes any lead or booking creation
3. Makes an API call to `/api/emails/process-submission` with the submission ID and form ID
4. Handles any email processing errors gracefully without failing the submission

This ensures that even if email processing fails, the form submission is still recorded and can be manually processed later.
