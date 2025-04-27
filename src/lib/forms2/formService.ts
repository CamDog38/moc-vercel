/**
 * Form Service
 * 
 * This file provides a unified API for all form operations.
 * It acts as a facade for the various repositories.
 */

import { FormConfig, FormSubmissionData } from './core/types';
import { 
  FormRepository, 
  SubmissionRepository, 
  LeadBookingRepository 
} from './repositories';

export class FormService {
  private formRepository: FormRepository;
  private submissionRepository: SubmissionRepository;
  private leadBookingRepository: LeadBookingRepository;

  constructor() {
    this.formRepository = new FormRepository();
    this.submissionRepository = new SubmissionRepository();
    this.leadBookingRepository = new LeadBookingRepository();
  }

  // Form operations
  
  async getAllForms(userId: string) {
    return this.formRepository.getAllForms(userId);
  }

  async getFormById(id: string) {
    return this.formRepository.getFormById(id);
  }

  async createForm(data: {
    title: string;
    description?: string;
    type: string;
    userId: string;
    isActive?: boolean;
    isPublic?: boolean;
    submitButtonText?: string;
    successMessage?: string;
    legacyFormId?: string;
    formConfig?: FormConfig;
    name: string;
  }) {
    return this.formRepository.createForm(data);
  }

  async updateForm(id: string, data: any) {
    return this.formRepository.updateForm(id, data);
  }

  async deleteForm(id: string) {
    return this.formRepository.deleteForm(id);
  }

  async saveFormConfig(formConfig: FormConfig, userId: string) {
    return this.formRepository.saveFormConfig(formConfig, userId);
  }

  async updateFormConfig(formId: string, formConfig: FormConfig) {
    return this.formRepository.updateFormConfig(formId, formConfig);
  }

  async convertToFormConfig(form: any, sections: any[]) {
    return this.formRepository.convertToFormConfig(form, sections);
  }

  // Submission operations
  
  async createSubmission(data: {
    formId: string;
    data: FormSubmissionData;
    userId?: string;
    status?: string;
    metadata?: Record<string, any>;
  }) {
    return this.submissionRepository.createSubmission(data);
  }

  async getSubmissionsByFormId(formId: string) {
    return this.submissionRepository.getSubmissionsByFormId(formId);
  }

  async getSubmissionById(id: string) {
    return this.submissionRepository.getSubmissionById(id);
  }

  async updateSubmission(id: string, data: any) {
    return this.submissionRepository.updateSubmission(id, data);
  }

  async deleteSubmission(id: string) {
    return this.submissionRepository.deleteSubmission(id);
  }

  async processSubmissionData(formId: string, submissionData: FormSubmissionData) {
    return this.submissionRepository.processSubmissionData(formId, submissionData);
  }

  // Lead and booking operations
  
  async createLead(formId: string, submissionData: FormSubmissionData, submissionId?: string) {
    return this.leadBookingRepository.createLead(formId, submissionData, submissionId);
  }

  async createBooking(formId: string, submissionData: FormSubmissionData, submissionId?: string) {
    return this.leadBookingRepository.createBooking(formId, submissionData, submissionId);
  }

  async getLeadsByFormId(formId: string) {
    return this.leadBookingRepository.getLeadsByFormId(formId);
  }

  async getBookingsByFormId(formId: string) {
    return this.leadBookingRepository.getBookingsByFormId(formId);
  }

  async updateLead(id: string, data: any) {
    return this.leadBookingRepository.updateLead(id, data);
  }

  async updateBooking(id: string, data: any) {
    return this.leadBookingRepository.updateBooking(id, data);
  }

  async deleteLead(id: string) {
    return this.leadBookingRepository.deleteLead(id);
  }

  async deleteBooking(id: string) {
    return this.leadBookingRepository.deleteBooking(id);
  }
}
