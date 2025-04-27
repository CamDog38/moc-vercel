/**
 * Section Handlers for Form Builder 2.0
 * 
 * This file contains handlers for adding, updating, and deleting sections in the form builder.
 */

import { FormConfig, FormSection } from '@/lib/forms2/core/types';
import { generateId } from '@/lib/forms2/utils/idUtils';

/**
 * Adds a new section to the form
 */
export const addSection = (formConfig: FormConfig): FormConfig => {
  const newSection: FormSection = {
    id: generateId(),
    title: `Section ${formConfig.sections.length + 1}`,
    fields: [],
    order: formConfig.sections.length
  };

  return {
    ...formConfig,
    sections: [...formConfig.sections, newSection]
  };
};

/**
 * Updates an existing section
 */
export const updateSection = (
  formConfig: FormConfig, 
  sectionIndex: number, 
  updatedSection: FormSection
): FormConfig => {
  const updatedSections = [...formConfig.sections];
  updatedSections[sectionIndex] = updatedSection;
  
  return {
    ...formConfig,
    sections: updatedSections
  };
};

/**
 * Deletes a section
 */
export const deleteSection = (
  formConfig: FormConfig, 
  sectionIndex: number
): FormConfig => {
  // Prevent deleting the last section
  if (formConfig.sections.length <= 1) {
    return formConfig;
  }

  const newSections = formConfig.sections.filter((_, index) => index !== sectionIndex);

  // Update the order of the remaining sections
  const updatedSections = newSections.map((section, index) => ({
    ...section,
    order: index
  }));

  return {
    ...formConfig,
    sections: updatedSections
  };
};
