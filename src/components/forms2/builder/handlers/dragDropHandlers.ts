/**
 * Drag and Drop Handlers for Form Builder 2.0
 * 
 * This file contains handlers for drag and drop operations in the form builder.
 */

import { DropResult } from 'react-beautiful-dnd';
import { FormConfig } from '@/lib/forms2/core/types';

/**
 * Handles the end of a drag operation
 */
export const handleDragEnd = (
  result: DropResult,
  formConfig: FormConfig,
  activeSectionIndex: number,
  setActiveSectionIndex: (index: number) => void
): FormConfig | null => {
  const { destination, source, type } = result;

  // If no destination or dropped in the same place, do nothing
  if (!destination || 
      (destination.droppableId === source.droppableId && 
       destination.index === source.index)) {
    return null;
  }

  // Handle section reordering
  if (type === 'section') {
    const reorderedSections = Array.from(formConfig.sections);
    const [removed] = reorderedSections.splice(source.index, 1);
    reorderedSections.splice(destination.index, 0, removed);

    // Update the order property of each section
    const updatedSections = reorderedSections.map((section, index) => ({
      ...section,
      order: index
    }));

    // Update active section index if needed
    if (source.index === activeSectionIndex) {
      setActiveSectionIndex(destination.index);
    } else if (
      (source.index < activeSectionIndex && destination.index >= activeSectionIndex) ||
      (source.index > activeSectionIndex && destination.index <= activeSectionIndex)
    ) {
      // If a section moved across the active section, adjust the active section index
      setActiveSectionIndex((prev: number) => {
        if (source.index < prev) {
          return prev - 1;
        } else {
          return prev + 1;
        }
      });
    }

    return {
      ...formConfig,
      sections: updatedSections
    };
  }

  // Handle field reordering within a section
  if (type === 'field' && source.droppableId === destination.droppableId) {
    const sectionId = source.droppableId;
    const sectionIndex = formConfig.sections.findIndex(section => section.id === sectionId);
    
    if (sectionIndex === -1) return null;
    
    const fields = Array.from(formConfig.sections[sectionIndex].fields);
    const [removed] = fields.splice(source.index, 1);
    fields.splice(destination.index, 0, removed);
    
    const updatedSections = [...formConfig.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      fields
    };
    
    return {
      ...formConfig,
      sections: updatedSections
    };
  }

  // Handle field moving between sections
  if (type === 'field' && source.droppableId !== destination.droppableId) {
    const sourceSectionId = source.droppableId;
    const destSectionId = destination.droppableId;
    
    const sourceSectionIndex = formConfig.sections.findIndex(section => section.id === sourceSectionId);
    const destSectionIndex = formConfig.sections.findIndex(section => section.id === destSectionId);
    
    if (sourceSectionIndex === -1 || destSectionIndex === -1) return null;
    
    const sourceFields = Array.from(formConfig.sections[sourceSectionIndex].fields);
    const destFields = Array.from(formConfig.sections[destSectionIndex].fields);
    
    const [removed] = sourceFields.splice(source.index, 1);
    destFields.splice(destination.index, 0, removed);
    
    const updatedSections = [...formConfig.sections];
    updatedSections[sourceSectionIndex] = {
      ...updatedSections[sourceSectionIndex],
      fields: sourceFields
    };
    updatedSections[destSectionIndex] = {
      ...updatedSections[destSectionIndex],
      fields: destFields
    };
    
    return {
      ...formConfig,
      sections: updatedSections
    };
  }

  return null;
};
