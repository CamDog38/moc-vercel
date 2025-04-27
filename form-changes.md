# Form Builder Enhancement Plan

## Overview
This document tracks all changes made to the form builder system, ensuring we maintain compatibility with existing functionality while enhancing the user experience and adding new features.

## Current System Analysis

### Core Components:
1. **Form Data Structure**
   - Forms have sections containing fields
   - Fields have properties including types, validation, and conditional logic
   - Stable IDs serve as permanent identifiers for fields, crucial for email rules

2. **Form Field Types**
   - Current types: text, textarea, email, tel, number, date, select, checkbox, radio
   - Only select field has UI for managing options
   - Radio and checkbox lack options management UI
   - Options stored in `options?: string[]` property

3. **Validation System**
   - Basic required field validation
   - No specialized validation for different field types
   - Simple error messages without clear visual indicators
   - No field-specific validation rules

4. **Email Rules and Conditional Logic**
   - Email rules reference fields using their `stableId` values
   - Conditional logic controls field visibility based on other field values
   - Both systems rely on stable field identifiers

## Implementation Plan

### Phase 1: Fix Radio and Checkbox Options Management

#### 1. Radio Button Options Management
**Description:** Add options management UI for radio button fields similar to select fields.

**Implementation Steps:**
1. Modify `renderFieldEditor` to show options editor when field.type === "radio"
2. Reuse existing options editor UI and logic from select fields
3. Ensure radio options are properly saved to the field's options array
4. Update the initial field creation to add empty options array for radio fields

**Files to Change:**
- `src/components/FormBuilder.tsx`
  - Update `renderFieldEditor` function to show options UI for radio fields
  - Update `addField` function to initialize options for radio fields

**Compatibility Considerations:**
- Existing radio fields may not have options array initialized
- Handle null/undefined options gracefully

#### 2. Checkbox Options Management
**Description:** Add options management UI for checkbox fields for multi-select functionality.

**Implementation Steps:**
1. Modify `renderFieldEditor` to show options editor when field.type === "checkbox"
2. Reuse existing options editor UI and logic with modifications for multi-select
3. Update the field creation to add empty options array for checkbox fields
4. Add handling for checkbox values as arrays in form submission

**Files to Change:**
- `src/components/FormBuilder.tsx`
  - Update `renderFieldEditor` function to show options UI for checkbox fields
  - Update `addField` function to initialize options for checkbox fields

**Compatibility Considerations:**
- Existing checkbox fields may be boolean rather than multi-select
- Update form rendering to handle both boolean and multi-select checkboxes

### Phase 2: Add New Field Types

#### 3. Enhanced Date of Birth Field
**Description:** Create a specialized date field for date of birth with appropriate validation.

**Implementation Steps:**
1. Add "dob" to field type options
2. Create specialized date picker component with format options
3. Add validation for past dates
4. Update form rendering to display DOB fields appropriately

**Files to Change:**
- `src/components/FormBuilder.tsx`
  - Add "dob" to field type options
  - Update field rendering for DOB type
- Create `src/components/DobPicker.tsx` for specialized date picker

**Compatibility Considerations:**
- Ensure DOB values are handled correctly in form submission
- Validate that email rules can reference DOB fields correctly

#### 4. Segmented Control (iOS-style)
**Description:** Add a new segmented control field type with custom styling.

**Implementation Steps:**
1. Add "segmented" to field type options
2. Create options management UI similar to radio buttons
3. Create specialized segmented control renderer component
4. Update form submission to handle segmented values

**Files to Change:**
- `src/components/FormBuilder.tsx`
  - Add "segmented" to field type options
  - Add options management for segmented controls
- Create `src/components/ui/segmented-control.tsx` for the UI component

**Compatibility Considerations:**
- Ensure segmented control values are properly stored and retrieved
- Test with email rules and conditional logic

### Phase 3: Enhance Form Validation

#### 5. Field-Type Validation
**Description:** Add specialized validation for each field type.

**Implementation Steps:**
1. Create validation rules for each field type:
   - Email: Format validation
   - Phone: Format validation with country code support
   - Number: Min/max/step validation
   - Date: Date range validation
   - DOB: Valid date in the past
2. Update field editor to include validation options
3. Add visual indicators for validation errors

**Files to Change:**
- `src/components/FormBuilder.tsx`
  - Add validation options to field editor
  - Enhance error display with visual indicators
- Create `src/util/validation-rules.ts` for validation logic

#### 6. Form-Level Validation
**Description:** Improve overall form validation experience.

**Implementation Steps:**
1. Add field highlighting for errors
2. Improve error message display
3. Add form-level error summary
4. Implement focus on first error field

**Files to Change:**
- `src/components/FormBuilder.tsx`
  - Update error display logic
  - Add error summary component
  - Implement focus logic

## Compatibility Testing

Before each change is committed, we will verify:

1. **Email Rules Compatibility**
   - Email rules continue to reference fields correctly
   - Rules function with new and modified field types

2. **Conditional Logic**
   - Conditional logic works with new and modified field types
   - Visibility rules apply correctly

3. **Form Submission**
   - All field types serialize correctly
   - Validation works as expected
   - Form data structure remains compatible with backend

## Implementation Tracking

### Phase 1: Radio and Checkbox Options Management
- [ ] Fix Radio Button Options Management
- [ ] Fix Checkbox Options Management

### Phase 2: Add New Field Types
- [ ] Implement Date of Birth field
- [ ] Implement Segmented Control field

### Phase 3: Enhance Form Validation
- [ ] Implement field-type validation
- [ ] Improve form-level validation

## Current Progress

We will update this section as changes are implemented:

### Completed Changes
None yet

### In Progress
None yet

### Testing Notes
None yet 