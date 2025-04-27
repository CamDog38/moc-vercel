/**
 * Bookings API Types
 * 
 * This file contains all the type definitions for the bookings API
 */

export interface FormField {
  id: string;
  label: string;
  type: string;
  options?: string[];
  excludeTime?: boolean;
  required?: boolean;
  sectionId: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: FormField[];
}

export interface Form {
  id: string;
  name: string;
  formSections: FormSection[];
  fields?: any; // For Form System 2.0 compatibility
}

export interface Submission {
  id: string;
  data: Record<string, any>;
}

export interface Invoice {
  id: string;
  status: string;
  totalAmount: number;
  serviceType?: string;
  serviceRate?: number;
  travelCosts?: number;
}

export interface Booking {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  date: Date | string;
  time: string | null;
  location: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  form?: Form;
  submissions?: Submission[];
  invoices?: Invoice[];
  mappedData?: Record<string, any>;
  isFormSystem2?: boolean;
}

export interface BookingWithForm extends Booking {
  form: Form;
  submissions: Submission[];
}

export interface BookingFilters {
  upcoming?: boolean;
  id?: string;
  userId?: string;
  officerId?: string;
  status?: string;
}
