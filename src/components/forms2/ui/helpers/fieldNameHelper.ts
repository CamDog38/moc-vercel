/**
 * Field Name Helper Functions
 * 
 * Helper functions for generating and managing field names in the form builder.
 * These functions ensure consistent field naming across the application and
 * provide automatic name generation based on field labels and section titles.
 * 
 * Key features:
 * - Consistent field name generation with proper formatting
 * - Section-based prefixing for organized field names
 * - Smart detection of auto-generated vs. custom field names
 * - Fallback mechanisms for empty or invalid inputs
 * - Batch updating of field names when section titles change
 */

/**
 * Generate a field name from a section title and field label
 * 
 * @param fieldLabel The label of the field
 * @param sectionTitle The title of the section containing the field
 * @param fieldId Optional field ID to use as fallback
 * @returns A properly formatted field name
 */
export function generateFieldName(fieldLabel: string, sectionTitle?: string, fieldId?: string): string {
  // Generate a slug from the field label
  let fieldSlug = fieldLabel
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  // If we have a section title, prefix the slug with the section name
  if (sectionTitle) {
    const sectionSlug = sectionTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Combine section name and field name
    fieldSlug = `${sectionSlug}_${fieldSlug}`;
  }
  
  // If the field slug is empty, use a fallback based on the field ID
  if (!fieldSlug && fieldId) {
    fieldSlug = `field_${fieldId.substring(0, 6)}`;
  } else if (!fieldSlug) {
    // If no field ID is provided, use a timestamp
    fieldSlug = `field_${Date.now().toString(36)}`;
  }
  
  return fieldSlug;
}

/**
 * Update field names in a section when the section title changes
 * 
 * @param fields Array of field configs to update
 * @param newSectionTitle The new section title
 * @param forceUpdate Whether to force update all field names regardless of other conditions
 * @returns Updated array of field configs with new names
 */
export function updateFieldNamesForSection(fields: any[], newSectionTitle: string, forceUpdate: boolean = true): any[] {
  return fields.map(field => {
    // Only update fields that have a label
    if (field.label) {
      // Check if we should update this field's name
      const shouldUpdate = forceUpdate || shouldAutoUpdateFieldName(field);
      
      if (shouldUpdate) {
        const newName = generateFieldName(field.label, newSectionTitle, field.id);
        console.log(`Updating field "${field.label}" name to "${newName}" due to section title change.`);
        
        // Create a mapping object if needed
        const mapping = field.mapping && typeof field.mapping === 'object' 
          ? {
              ...field.mapping,
              value: newName,
              customKey: newName
            }
          : {
              type: 'custom',
              value: newName,
              customKey: newName
            };
        
        return {
          ...field,
          name: newName,
          mapping
        };
      } else {
        console.log(`Not updating field "${field.label}" name because it appears to be custom.`);
      }
    }
    
    return field;
  });
}

/**
 * Should the field name be automatically updated?
 * 
 * @param field The field config to check
 * @param forceUpdate Whether to force an update regardless of other conditions
 * @returns True if the field name should be auto-updated
 */
export function shouldAutoUpdateFieldName(field: any, forceUpdate: boolean = false): boolean {
  // If force update is set, always return true
  if (forceUpdate) {
    return true;
  }
  
  // Don't auto-update if the field has a custom mapping that doesn't match the auto-generated pattern
  if (field.mapping && typeof field.mapping === 'object' && field.mapping.type !== 'custom') {
    return false;
  }
  
  // If the field doesn't have a name yet, we should auto-update
  if (!field.name) {
    return true;
  }
  
  // If the field name is empty or just whitespace, we should auto-update
  if (typeof field.name === 'string' && field.name.trim() === '') {
    return true;
  }
  
  // If the field has a label and the name follows our auto-generated pattern,
  // we should continue to auto-update it
  if (field.label && field.name) {
    // Check if the name contains underscores, which is our auto-generated format
    if (field.name.includes('_')) {
      return true;
    }
    
    // Check if the name is derived from the label
    const labelSlug = field.label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    // If the name contains the label slug, it was likely auto-generated
    return field.name.includes(labelSlug);
  }
  
  return false;
}
