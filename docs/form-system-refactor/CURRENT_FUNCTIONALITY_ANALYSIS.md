# Current FormBuilder Functionality Analysis

This document provides a comprehensive analysis of the current FormBuilder component to ensure all functionality is preserved in the new architecture.

## Core Functionality

| Current Feature | Description | New Architecture Component |
|----------------|-------------|---------------------------|
| Form State Management | Uses React Hook Form for form state | `FormProvider`, `FormContext`, `formReducer` |
| Field Registration | Registers fields with validation | `useField` hook, `FieldRegistry` |
| Form Submission | Handles form submission and validation | `useForm` hook, `handleSubmit` function |
| Conditional Logic | Shows/hides fields based on conditions | `ConditionalLogic` component, `evaluateConditions` function |
| Drag and Drop | Allows reordering fields via drag and drop | `DragDropContext` in `FormBuilder` component |
| Multi-page Forms | Supports forms with multiple pages/sections | `FormSection` component, section navigation |
| Field Mapping | Maps fields to standard identifiers | `FieldMapping` system in core types |

## Field Types

| Field Type | Current Implementation | New Architecture Component |
|------------|------------------------|---------------------------|
| Text | Basic text input | `TextField` component |
| Textarea | Multi-line text input | `TextareaField` component |
| Email | Email input with validation | `EmailField` component |
| Tel | Phone number input | `PhoneField` component |
| Number | Numeric input | `NumberField` component |
| Date | Date picker | `DateField` component |
| Date of Birth | Specialized date picker | `DobField` component |
| Select | Dropdown selection | `SelectField` component |
| Checkbox | Single or multiple checkboxes | `CheckboxField` component |
| Radio | Radio button group | `RadioField` component |

## Form Builder Features

| Feature | Current Implementation | New Architecture Component |
|---------|------------------------|---------------------------|
| Add Field | `addField` function | `FieldAdder` component |
| Update Field | `updateField` function | `FieldEditor` component |
| Remove Field | `removeField` function | `FieldRemover` component |
| Add Section | `addSection` function | `SectionAdder` component |
| Update Section | `updateSection` function | `SectionEditor` component |
| Remove Section | `removeSection` function | `SectionRemover` component |
| Field Type Selection | Dropdown for new field types | `FieldTypeSelector` component |
| Field Properties | UI for editing field properties | `FieldPropertiesEditor` component |
| Conditional Logic UI | UI for setting up conditional logic | `ConditionalLogicEditor` component |

## Form Renderer Features

| Feature | Current Implementation | New Architecture Component |
|---------|------------------------|---------------------------|
| Field Rendering | `renderField` function | `FieldRenderer` component |
| Error Display | `renderErrorMessage` function | `ErrorMessage` component |
| Value Formatting | `formatFieldValue` function | `ValueFormatter` utility |
| Conditional Display | `shouldShowField` function | `ConditionalDisplay` component |
| Section Navigation | Tab-based section navigation | `SectionNavigator` component |

## Validation Features

| Feature | Current Implementation | New Architecture Component |
|---------|------------------------|---------------------------|
| Required Fields | Required validation | `requiredValidator` function |
| Email Validation | Email format validation | `emailValidator` function |
| Phone Validation | Phone format validation | `phoneValidator` function |
| Custom Validation | Support for custom validation rules | `createValidator` utility |
| Error Messages | Display of validation errors | `ValidationError` component |

## Integration with Email Rules

| Feature | Current Implementation | New Architecture Component |
|---------|------------------------|---------------------------|
| Field Mapping | Maps fields to standard identifiers | `FieldIdentity` system |
| Stable IDs | Uses stable IDs for field references | `StableId` generation utility |
| Rule Usage Tracking | Tracks if fields are used in rules | `RuleUsageTracker` component |
| Variable Replacement | Replaces variables in email templates | `VariableReplacer` utility |

## Missing or Problematic Features

| Issue | Current Implementation | Proposed Solution |
|-------|------------------------|-------------------|
| Field Type Changes | Cannot change field types | New architecture will support field type conversion |
| Email Rule Breakage | Rules break when fields change | Improved field identity system with versioning |
| Validation Issues | Inconsistent validation | Centralized validation system |
| Large Component | Monolithic 1700+ line component | Modular architecture with focused components |
| Weak Mapping | Complex mapping approach | Semantic field identifiers with clear hierarchy |

## Additional Considerations

### Field Properties

The current FormField type includes these properties:

```typescript
export type FormField = {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  mapping?: 'name' | 'email' | 'phone' | 'date' | 'time' | 'location' | 'location_office' | 'datetime' | null;
  excludeTime?: boolean;
  validation?: Record<string, any>;
  helpText?: string;
  order?: number;
  conditionalLogic?: ConditionalLogic;
  stableId?: string;
  inUseByRules?: boolean;
};
```

All of these properties are preserved in our new architecture's `FieldConfig` types, with improvements to type safety and extensibility.

### Conditional Logic

The current ConditionalLogic type:

```typescript
export type ConditionalLogic = {
  fieldId: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains';
  value: string;
  action: 'show' | 'hide';
};
```

Our new architecture expands this to include more operators and actions while maintaining backward compatibility.

### Form Sections

The current FormSection type:

```typescript
export type FormSection = {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
};
```

Our new architecture preserves this structure while adding support for section-level conditional logic and improved organization.

## Migration Considerations

When migrating from the current FormBuilder to the new architecture, we need to ensure:

1. **Data Format Compatibility**: The new system must be able to read existing form definitions
2. **API Compatibility**: The new components should have similar props to minimize changes in parent components
3. **Behavior Consistency**: The new system should behave the same way for end users
4. **Rule Preservation**: Existing email rules must continue to work with the new system

## Conclusion

This analysis confirms that our proposed architecture covers all the functionality of the current FormBuilder while addressing its limitations. The modular approach will make the system more maintainable and extensible while preserving compatibility with existing forms and email rules.
