/**
 * Booking Service
 * 
 * Handles business logic for bookings
 */

import { BookingRepository } from '../repositories/bookingRepository';
import { Booking, BookingFilters } from '../types/types';
import * as logger from '@/util/logger';
import { addApiLog } from '@/pages/api/debug/logs';

export class BookingService {
  private bookingRepository: BookingRepository;
  
  constructor() {
    this.bookingRepository = new BookingRepository();
  }
  
  /**
   * Get all bookings with filters
   */
  async getAllBookings(filters: BookingFilters = {}, includeOptions: any = {}, take: number = 50): Promise<Booking[]> {
    try {
      addApiLog('Starting bookings fetch', 'info', 'bookings');
      
      // Create a timeout promise to prevent hanging requests
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Database query timeout after 10 seconds'));
        }, 10000); // 10 second timeout
      });
      
      // Get legacy bookings
      const legacyBookingsPromise = this.bookingRepository.findBookings(filters, includeOptions, take);
      
      // Get Form System 2.0 bookings
      const forms2BookingsPromise = this.bookingRepository.findForms2Bookings(take);
      
      // Race the promises
      const [legacyBookings, forms2Bookings] = await Promise.all([
        Promise.race([legacyBookingsPromise, timeoutPromise]) as any as Promise<Booking[]>,
        Promise.race([forms2BookingsPromise, timeoutPromise]) as any as Promise<any[]>
      ]);
      
      addApiLog(`Retrieved ${legacyBookings.length} legacy bookings and ${forms2Bookings.length} Form System 2.0 bookings`, 'success', 'bookings');
      
      // Transform Form System 2.0 bookings to match the legacy format
      const transformedForms2Bookings = this.transformForms2Bookings(forms2Bookings);
      
      // Combine legacy and Form System 2.0 bookings
      const allBookings = [...legacyBookings, ...transformedForms2Bookings];
      
      // Sort combined bookings by date with error handling
      this.sortBookingsByDate(allBookings);
      
      return allBookings;
    } catch (error) {
      logger.error(`Error getting all bookings: ${error instanceof Error ? error.message : 'Unknown error'}`, 'bookings');
      throw error;
    }
  }
  
  /**
   * Transform Form System 2.0 bookings to match legacy format
   */
  private transformForms2Bookings(forms2Bookings: any[]): Booking[] {
    return forms2Bookings.map(submission => {
      try {
        // Check if submission and form exist
        if (!submission || !submission.form) {
          throw new Error('Missing submission or form data');
        }

        // Parse the form fields with null checks
        const formFields = submission.form.fields ? (
          typeof submission.form.fields === 'string' 
            ? JSON.parse(submission.form.fields) 
            : submission.form.fields
        ) : {};

        // Parse the submission data with null checks
        const submissionData = submission.data ? (
          typeof submission.data === 'string'
            ? JSON.parse(submission.data)
            : submission.data
        ) : {};

        // Extract common fields with proper null checks
        const name = submissionData.name || submissionData.full_name || null;
        const email = submissionData.email || null;
        const phone = submissionData.phone || null;
        
        // Handle date with proper null checks and fallbacks
        let date = null;
        try {
          // First try to get the date from the booking
          if (submission.booking && submission.booking.date) {
            date = submission.booking.date;
          } 
          // If no booking date, try to get it from the submission data
          else if (submissionData.date) {
            date = new Date(submissionData.date);
          } 
          // If still no date, use the submission creation date
          else {
            date = submission.createdAt;
          }
        } catch (e) {
          // If all else fails, use current date
          date = new Date();
          addApiLog(`Error parsing date for submission ${submission.id}: ${e}`, 'error', 'bookings');
        }
        
        // Format dates with proper null checks
        const dateStr = date ? date.toISOString() : new Date().toISOString();
        const createdAtStr = submission.createdAt ? submission.createdAt.toISOString() : new Date().toISOString();
        const updatedAtStr = submission.updatedAt ? submission.updatedAt.toISOString() : new Date().toISOString();
        
        // Create a transformed booking that matches the legacy format
        return {
          id: submission.bookingId || submission.id || 'unknown',
          name,
          email,
          phone,
          date: dateStr,
          time: submission.booking?.time || null,
          location: submission.booking?.location || null,
          status: submission.booking?.status || 'PENDING',
          createdAt: createdAtStr,
          updatedAt: updatedAtStr,
          form: {
            id: submission.form?.id || 'unknown',
            name: submission.form?.name || 'Unknown Form',
            fields: formFields || {},
            formSections: Array.isArray(formFields?.sections) ? formFields.sections : []
          },
          submissions: [{
            id: submission.id || 'unknown',
            data: submissionData || {}
          }],
          // Add a flag to identify this as a Form System 2.0 booking
          isFormSystem2: true,
          // Include mapped data for consistency
          mappedData: {
            name,
            email,
            phone,
            date: dateStr
          }
        };
      } catch (error) {
        logger.error(`Error transforming Form System 2.0 booking: ${error instanceof Error ? error.message : 'Unknown error'}`, 'bookings');
        // Return a minimal booking object to avoid breaking the UI
        return {
          id: submission.id || 'unknown',
          name: 'Error processing booking',
          email: null,
          phone: null,
          date: new Date().toISOString(),
          time: null,
          location: null,
          status: 'ERROR',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isFormSystem2: true
        };
      }
    });
  }
  
  /**
   * Sort bookings by date
   */
  private sortBookingsByDate(bookings: Booking[]): void {
    try {
      bookings.sort((a, b) => {
        try {
          const dateA = a.date ? new Date(a.date) : new Date();
          const dateB = b.date ? new Date(b.date) : new Date();
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          addApiLog(`Error comparing dates: ${e}`, 'error', 'bookings');
          return 0; // Keep original order if date comparison fails
        }
      });
    } catch (e) {
      addApiLog(`Error sorting bookings: ${e}`, 'error', 'bookings');
      // Continue without sorting if it fails
    }
  }
  
  /**
   * Get a booking by ID
   */
  async getBookingById(id: string): Promise<Booking | null> {
    try {
      const includeOptions = {
        form: {
          select: {
            id: true,
            name: true,
            formSections: {
              include: {
                fields: true
              }
            }
          }
        },
        submissions: {
          select: {
            id: true,
            data: true
          }
        },
        invoices: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            serviceType: true,
            serviceRate: true,
            travelCosts: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      };
      
      return await this.bookingRepository.getBookingById(id, includeOptions);
    } catch (error) {
      logger.error(`Error getting booking by ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 'bookings');
      throw error;
    }
  }
}

export default new BookingService();
