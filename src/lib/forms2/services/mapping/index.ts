/**
 * Form Mapping Service
 * 
 * This file exports the form mapping service functionality.
 */

// Export types
export * from './types';

// Export core mapper
export { mapFormFields } from './mapper';

// Export strategies for advanced usage
export {
  explicitMappingStrategy,
  fieldTypeStrategy,
  fieldLabelStrategy,
  fieldIdStrategy,
  valuePatternStrategy
} from './strategies';

// Export contact info extractor
export { extractContactInfo } from './contactInfoExtractor';

// Default export for backward compatibility
import { mapFormFields } from './mapper';
export default mapFormFields;
