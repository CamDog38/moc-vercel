/**
 * Form Repository
 * 
 * This file is a facade that exports the modular form repository implementation.
 * It has been refactored to improve maintainability and reduce file size.
 */

import { FormRepository as ModularFormRepository } from './form';

// Re-export the FormRepository class
export class FormRepository extends ModularFormRepository {}

// This file is kept for backward compatibility.
// New code should import directly from the modular structure:
// import { FormRepository } from '@/lib/forms2/repositories/form';
