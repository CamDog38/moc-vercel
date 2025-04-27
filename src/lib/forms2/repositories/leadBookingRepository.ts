/**
 * Lead and Booking Repository
 * 
 * This file contains the repository for lead and booking operations.
 */

import { Lead, Booking } from '@prisma/client';
import { prisma, BaseRepository } from './baseRepository';
import { FormSubmissionData } from '../core/types';
import { SubmissionRepository } from './submissionRepository';

export class LeadBookingRepository extends BaseRepository {
  private submissionRepository: SubmissionRepository;

  constructor() {
    super();
    this.submissionRepository = new SubmissionRepository();
  }

  /**
   * Create a lead from form submission data
   */
  async createLead(formId: string, submissionData: FormSubmissionData, submissionId?: string): Promise<Lead> {
    // Process the submission data to extract mapped fields
    const processedData = await this.submissionRepository.processSubmissionData(formId, submissionData);
    
    // Extract lead data from processed data
    const { name, email, phone, ...additionalData } = processedData;
    
    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        name: name || 'Unknown',
        email: email || null,
        phone: phone || null,
        status: 'NEW',
        source: 'FORM',
        formId: formId,
        // Create a relation to the submission if provided
        ...(submissionId && {
          submissions: {
            connect: { id: submissionId }
          }
        }),
        metadata: JSON.stringify({
          formData: submissionData,
          additionalData
        }),
      },
    });
    
    return lead;
  }

  /**
   * Create a booking from form submission data
   */
  async createBooking(formId: string, submissionData: FormSubmissionData, submissionId?: string): Promise<Booking> {
    // Process the submission data to extract mapped fields
    const processedData = await this.submissionRepository.processSubmissionData(formId, submissionData);
    
    // Extract booking data from processed data
    const { 
      name, 
      email, 
      phone, 
      date, 
      time, 
      datetime, 
      location, 
      location_office,
      ...additionalData 
    } = processedData;
    
    // Determine the booking date and time
    let bookingDate: Date | null = null;
    let bookingTime: string | null = null;
    
    if (datetime) {
      // If datetime is provided, use it
      const dateTimeObj = new Date(datetime);
      bookingDate = dateTimeObj;
      bookingTime = dateTimeObj.toTimeString().substring(0, 5); // HH:MM format
    } else if (date) {
      // If separate date is provided
      bookingDate = new Date(date);
      
      // If time is also provided, set it
      if (time) {
        bookingTime = time;
        
        // Update the date with the time
        const [hours, minutes] = time.split(':').map(Number);
        bookingDate.setHours(hours, minutes);
      }
    }
    
    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        title: `Booking for ${name || 'Unknown'}`,
        customerName: name || 'Unknown',
        customerEmail: email || null,
        customerPhone: phone || null,
        date: bookingDate,
        time: bookingTime,
        location: location || location_office || null,
        status: 'PENDING',
        formId: formId,
        // Create a relation to the submission if provided
        ...(submissionId && {
          submissions: {
            connect: { id: submissionId }
          }
        }),
        metadata: JSON.stringify({
          formData: submissionData,
          additionalData
        }),
      },
    });
    
    return booking;
  }

  /**
   * Get all leads for a form
   */
  async getLeadsByFormId(formId: string): Promise<Lead[]> {
    return prisma.lead.findMany({
      where: {
        formId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get all bookings for a form
   */
  async getBookingsByFormId(formId: string): Promise<Booking[]> {
    return prisma.booking.findMany({
      where: {
        formId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update a lead
   */
  async updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
    // Extract fields that need to be stringified
    const { metadata, ...restData } = data as any;
    
    return prisma.lead.update({
      where: {
        id,
      },
      data: {
        ...restData,
        ...(metadata && { metadata: JSON.stringify(metadata) }),
      },
    });
  }

  /**
   * Update a booking
   */
  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    // Extract fields that need to be stringified
    const { metadata, ...restData } = data as any;
    
    return prisma.booking.update({
      where: {
        id,
      },
      data: {
        ...restData,
        ...(metadata && { metadata: JSON.stringify(metadata) }),
      },
    });
  }

  /**
   * Delete a lead
   */
  async deleteLead(id: string): Promise<Lead> {
    return prisma.lead.delete({
      where: {
        id,
      },
    });
  }

  /**
   * Delete a booking
   */
  async deleteBooking(id: string): Promise<Booking> {
    return prisma.booking.delete({
      where: {
        id,
      },
    });
  }
}
