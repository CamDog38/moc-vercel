# Stable IDs in Form System 2.0

## Overview

Stable IDs are a critical feature in Form System 2.0 that ensure form fields can be reliably referenced even when forms are modified or recreated. This is especially important for email rules, which need to match against specific fields in form submissions.

## Problem Solved

Without stable IDs, when a form is modified or recreated:

1. Field IDs change, breaking existing email rules
2. Field references in conditions become invalid
3. Email rules stop working correctly
4. Users need to manually recreate rules after form changes

## How Stable IDs Work

Stable IDs are deterministic identifiers generated based on field properties that remain consistent across form versions:

1. **Field Type Recognition**: Common field types like email, phone, and name get standardized stable IDs
2. **Label-Based Generation**: For custom fields, stable IDs are generated from the field label
3. **Section Context**: Section titles are incorporated to avoid conflicts between similarly named fields in different sections
4. **Persistence**: Once generated, stable IDs are stored with the field and preserved across form edits

## Benefits for Email Rules

Email rules now use stable IDs instead of raw field IDs, providing several advantages:

1. **Durability**: Rules continue to work even when forms are modified
2. **Reliability**: Field matching is more robust with multiple fallback strategies
3. **Readability**: Rules are more human-readable with meaningful identifiers
4. **Maintainability**: Less manual intervention needed when forms change

## Implementation Details

The stable ID system consists of several components:

1. **Generation**: `stableIdGenerator.ts` provides utilities for creating and managing stable IDs
2. **Storage**: Stable IDs are stored as a property on each field in the form configuration
3. **Display**: The form builder UI shows stable IDs to help with rule creation
4. **Matching**: `field-id-mapper2.ts` handles finding fields by stable ID during form submission processing

## Example

A form with an email field might have:

- **Field ID**: `field_1234` (changes when form is recreated)
- **Stable ID**: `email` (remains consistent)

An email rule condition using this field would reference the stable ID:

```json
{
  "field": "email",
  "fieldStableId": "email",
  "operator": "equals",
  "value": "test@example.com"
}
```

When the form is recreated, the field ID might change to `field_5678`, but the stable ID remains `email`, allowing the rule to continue working correctly.

## Best Practices

1. Always use the stable ID when creating email rule conditions
2. For custom fields, choose descriptive labels that will generate meaningful stable IDs
3. Organize related fields into sections to provide context for stable ID generation
4. Avoid changing field labels frequently if they're used in email rules