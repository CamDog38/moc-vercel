export interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  formId: string;
  createdAt: string;
  updatedAt: string;
  source: string | null;
  notes: string | null;
  formName?: string;
  mappedData?: Record<string, any>;
  submissions?: Array<{ data: Record<string, any> }>;
  form?: Form;
  data?: Record<string, any>;
}

export interface Form {
  id: string;
  name: string;
  type: string;
  formSections?: Array<{ fields?: Array<{ id: string; label: string; type?: string }> }>;
  fields?: Array<{ id: string; label: string; type?: string }>;
}

export interface LeadFilters {
  search?: string;
  status?: string;
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
  formId?: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
