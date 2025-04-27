/**
 * Booking Repository
 * 
 * Handles database operations for bookings
 */

import prisma from '@/lib/prisma';
import { Booking, BookingFilters } from '../types/types';
import * as logger from '@/util/logger';
import { addApiLog } from '@/pages/api/debug/logs';

export class BookingRepository {
  /**
   * Find bookings with filters
   */
  async findBookings(filters: BookingFilters = {}, includeOptions: any = {}, take: number = 50): Promise<any[]> {
    try {
      // Build the where clause based on filters
      let whereClause: any = {};
      
      // Apply ID filter if provided
      if (filters.id) {
        whereClause.id = filters.id;
      }
      
      // Apply officer filter if provided
      if (filters.officerId) {
        whereClause.invoices = {
          some: {
            officerId: filters.officerId
          }
        };
      }
      
      // Apply status filter if provided
      if (filters.status) {
        whereClause.status = filters.status;
      }
      
      // Apply upcoming filter if provided
      if (filters.upcoming) {
        whereClause.date = {
          gte: new Date()
        };
      }
      
      // Execute the query with a timeout for legacy bookings
      const legacyBookings = await prisma.booking.findMany({
        where: whereClause,
        include: includeOptions,
        orderBy: {
          date: 'asc'
        },
        take
      });
      
      return legacyBookings;
    } catch (error) {
      logger.error(`Error finding bookings: ${error instanceof Error ? error.message : 'Unknown error'}`, 'bookings');
      throw error;
    }
  }
  
  /**
   * Find Form System 2.0 bookings
   */
  async findForms2Bookings(take: number = 50): Promise<any[]> {
    try {
      // First, let's check if there are any form submissions at all
      const totalSubmissions = await prisma.formSubmission.count();
      addApiLog(`Total form submissions in database: ${totalSubmissions}`, 'info', 'bookings');
      
      // Check how many submissions have booking IDs
      const submissionsWithBookingIds = await prisma.formSubmission.count({
        where: {
          bookingId: { not: null }
        }
      });
      addApiLog(`Form submissions with booking IDs: ${submissionsWithBookingIds}`, 'info', 'bookings');
      
      // Let's check the form types available in the database
      const formTypes = await prisma.form.findMany({
        select: {
          id: true,
          name: true,
          type: true
        },
        take: 10
      });
      
      addApiLog(`Sample form types in database: ${JSON.stringify(formTypes.map(f => ({ id: f.id, name: f.name, type: f.type })))}`, 'info', 'bookings');
      
      // Get all form submissions that have a booking ID
      // This is our best approach since we don't have a reliable way to identify Form System 2.0 submissions
      const forms2Bookings = await prisma.formSubmission.findMany({
        where: {
          bookingId: { not: null }
        },
        include: {
          form: {
            select: {
              id: true,
              name: true,
              fields: true,
              type: true
            }
          },
          booking: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take
      });
      
      // Log the first few form submissions for debugging
      if (forms2Bookings.length > 0) {
        const sampleSubmissions = forms2Bookings.slice(0, 2);
        for (const submission of sampleSubmissions) {
          addApiLog(`Sample submission: ${JSON.stringify({
            id: submission.id,
            formId: submission.formId,
            bookingId: submission.bookingId,
            formType: submission.form?.type,
            formName: submission.form?.name,
            hasBooking: !!submission.booking
          })}`, 'info', 'bookings');
        }
      }
      
      addApiLog(`Retrieved ${forms2Bookings.length} form submissions with booking IDs`, 'success', 'bookings');
      
      return forms2Bookings;
    } catch (error) {
      logger.error(`Error finding Form System 2.0 bookings: ${error instanceof Error ? error.message : 'Unknown error'}`, 'bookings');
      throw error;
    }
  }
  
  /**
   * Get a booking by ID
   */
  async getBookingById(id: string, includeOptions: any = {}): Promise<Booking | null> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: includeOptions
      });
      
      return booking;
    } catch (error) {
      logger.error(`Error getting booking by ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 'bookings');
      throw error;
    }
  }
}
