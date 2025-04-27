/**
 * Bookings API
 * 
 * This API endpoint handles all booking-related operations
 */

import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';
import { addApiLog } from '../debug/logs';
import * as logger from '@/util/logger';
import bookingService from '@/lib/bookings/services/bookingService';
import { BookingFilters } from '@/lib/bookings/types/types';

/**
 * Bookings API Handler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if this is a public context request (for form submissions)
  // Public context can be set via header or by checking the referer for lead forms
  const { shouldTreatAsPublicContext } = require('@/util/public-context');
  const isPublicContext = shouldTreatAsPublicContext(req);
  
  // Log the request context
  addApiLog(`API request to bookings with public context: ${isPublicContext}`, 'info', 'bookings');
  
  let user = null;
  let dbUser = null;
  
  try {
    // Only authenticate if not in public context
    if (!isPublicContext) {
      // Get the authenticated user
      const supabase = createClient(req, res);
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        addApiLog('Auth error or no user', 'error', 'bookings');
        console.error('API: Authentication error:', authError);
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      user = authUser;
      addApiLog('Authenticated user', 'success', 'bookings');

      // Ensure user exists in the database
      try {
        dbUser = await ensureUserExists(user);
      } catch (error) {
        addApiLog(`Error ensuring user exists: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'bookings');
        console.error('API: Failed to ensure user exists:', error);
        return res.status(401).json({ error: 'Failed to verify user in database' });
      }

      addApiLog('User exists in database', 'success', 'bookings');

      if (process.env.NODE_ENV !== 'production') {
        console.log('API: Authenticated user:', user.id, 'Role:', dbUser?.role);
      }
    } else {
      addApiLog('Public context request, skipping authentication', 'info', 'bookings');
      if (process.env.NODE_ENV !== 'production') {
        console.log('API: Public context request, skipping authentication');
      }
    }

    switch (req.method) {
      case 'GET':
        return await handleGetBookings(req, res, isPublicContext, user, dbUser);
      
      case 'POST':
        return await handleCreateBooking(req, res, isPublicContext, user);
        
      case 'PUT':
        return await handleUpdateBooking(req, res, isPublicContext, user);
        
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    addApiLog(`Error in bookings API: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'bookings');
    console.error('API: Error in bookings API:', error);
    return res.status(500).json({ 
      error: 'Failed to process request', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Handle GET requests for bookings
 */
async function handleGetBookings(
  req: NextApiRequest, 
  res: NextApiResponse, 
  isPublicContext: boolean,
  user: any,
  dbUser: any
) {
  try {
    addApiLog('Starting bookings fetch', 'info', 'bookings');
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: Starting bookings fetch');
    }
    
    // Parse query parameters
    const { upcoming, id: queryId, all: fetchAll } = req.query;
    
    // Build filters based on query parameters
    const filters: BookingFilters = {};
    
    // Apply different filters based on context
    if (!isPublicContext) {
      // Authenticated context - apply role-based filtering
      if (dbUser?.role === 'MARRIAGE_OFFICER' && user) {
        filters.officerId = user.id;
      }
      // Admins can see all bookings - no additional filter needed
    } else {
      // Public context - require a specific booking ID
      if (queryId) {
        filters.id = String(queryId);
      } else {
        addApiLog('Public request without specific booking ID is not allowed', 'error', 'bookings');
        return res.status(403).json({ error: 'Public access requires a specific booking ID' });
      }
    }
    
    // Apply ID filter if provided
    if (queryId && typeof queryId === 'string') {
      filters.id = queryId;
    }
    
    // Apply upcoming filter if provided
    if (upcoming === 'true') {
      filters.upcoming = true;
    }
    
    // Determine which include options to use
    let includeOptions: any = {};
    
    if (upcoming === 'true') {
      // Simplified include for dashboard display
      includeOptions = {
        form: {
          select: {
            name: true
          }
        },
        // Use invoices (plural) instead of invoice (singular)
        invoices: {
          select: {
            id: true,
            status: true,
            totalAmount: true
          },
          // Order by creation date to get the most recent first
          orderBy: {
            createdAt: 'desc'
          },
          // Only include non-voided invoices
          where: {
            status: { not: 'voided' }
          }
        }
      };
    } else {
      // Full include for detailed view
      includeOptions = {
        form: {
          include: {
            formSections: {
              include: {
                fields: {
                  select: {
                    id: true,
                    label: true,
                    type: true,
                    options: true
                  }
                }
              }
            }
          }
        },
        submissions: {
          select: {
            id: true,
            data: true
          }
        }
      };
    }
    
    // Get bookings from the service
    // If fetchAll is true, don't limit the number of bookings
    const limit = fetchAll === 'true' ? 1000 : (upcoming === 'true' ? 10 : 50);
    const bookings = await bookingService.getAllBookings(
      filters, 
      includeOptions, 
      limit
    );
    
    // Transform the response to match the frontend interface
    const transformedBookings = bookings.map(booking => {
      // Add debug logging for Form System 2.0 bookings
      if (booking.isFormSystem2) {
        addApiLog(`Found Form System 2.0 booking: ${booking.id}`, 'info', 'bookings');
      }

      // Make sure booking.form exists
      if (!booking.form) {
        // Return booking with minimal form structure if form is missing
        return {
          ...booking,
          form: {
            id: booking.id || 'unknown',
            name: 'Unknown Form',
            sections: []
          },
          // Preserve the isFormSystem2 flag
          isFormSystem2: booking.isFormSystem2 || false
        };
      }

      // Make sure formSections exists and handle fields safely
      const sections = (booking.form.formSections || []).map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        fields: Array.isArray(section.fields) 
          ? section.fields.map(field => ({
              id: field.id,
              label: field.label,
              type: field.type,
              options: field.options
            }))
          : []
      }));

      return {
        ...booking,
        form: {
          ...booking.form,
          sections
        },
        // Preserve the isFormSystem2 flag
        isFormSystem2: booking.isFormSystem2 || false
      };
    });
    
    // Log how many Form System 2.0 bookings we found
    const forms2BookingsCount = transformedBookings.filter(b => b.isFormSystem2).length;
    addApiLog(`Found ${forms2BookingsCount} Form System 2.0 bookings out of ${transformedBookings.length} total bookings`, 'info', 'bookings');

    addApiLog(`Retrieved ${bookings.length} bookings`, 'success', 'bookings');
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: Successfully fetched bookings:', bookings.length);
    }
    return res.status(200).json(transformedBookings);
  } catch (error) {
    addApiLog(`Error retrieving bookings: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'bookings');
    console.error('API: Error fetching bookings:', error);
    return res.status(500).json({ error: 'Failed to fetch bookings: ' + (error as Error).message });
  }
}

/**
 * Handle POST requests to create a new booking
 */
async function handleCreateBooking(
  req: NextApiRequest, 
  res: NextApiResponse, 
  isPublicContext: boolean,
  user: any
) {
  try {
    const { formId, date, name, email, phone, mappedData } = req.body;

    // Allow booking creation through public context
    if (!isPublicContext && !user) {
      addApiLog('Unauthorized booking creation attempt', 'error', 'bookings');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!formId || !date || !name || !email) {
      addApiLog('Missing required fields', 'error', 'bookings');
      console.error('API: Missing required fields:', { formId, date, name, email });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    addApiLog(`Received booking creation request for form ID: ${formId}`, 'info', 'bookings');
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: Creating booking with data:', { formId, date, name, email, phone });
    }
    
    // Ensure date is a valid Date object
    let bookingDate;
    try {
      bookingDate = new Date(date);
      if (isNaN(bookingDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      addApiLog(`Invalid date format: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'bookings');
      console.error('API: Invalid date format:', date, error);
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    // Create the booking with timeout protection
    addApiLog(`Creating booking with name: ${name}, email: ${email}, date: ${bookingDate}`, 'info', 'bookings');
    
    // Add a timeout to prevent function timeout
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Database query timeout after 10 seconds'));
      }, 10000); // 10 second timeout
    });
    
    // Execute the query with a timeout
    const bookingPromise = prisma.booking.create({
      data: {
        formId,
        date: bookingDate,
        status: 'PENDING',
        name,
        email,
        phone,
        // If we have mapped data, store it in the notes field for reference
        notes: mappedData ? JSON.stringify(mappedData) : null
      }
    });
    
    let booking;
    try {
      booking = await Promise.race([bookingPromise, timeoutPromise]) as any;
    } catch (error) {
      addApiLog(`Error creating booking: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'bookings');
      console.error('API: Error creating booking:', error);
      throw error; // Rethrow to be caught by the outer try/catch
    }
    
    // If we have mapped data, create a form submission
    if (mappedData && Object.keys(mappedData).length > 0 && booking) {
      addApiLog(`Creating form submission for booking ID: ${booking.id}`, 'info', 'bookings');
      if (process.env.NODE_ENV !== 'production') {
        console.log('API: Creating form submission for booking:', booking.id);
      }
      
      // Extract tracking data from the request if available
      const trackingToken = req.body.trackingToken || null;
      const sourceLeadId = req.body.sourceLeadId || null;
      const timeStamp = req.body.timeStamp || new Date().toISOString();
      
      addApiLog(`Form submission tracking data: ${JSON.stringify({
        trackingToken,
        sourceLeadId,
        timeStamp
      })}`, 'info', 'bookings');
      
      try {
        const submission = await prisma.formSubmission.create({
          data: {
            formId,
            bookingId: booking.id,
            data: mappedData,
            trackingToken,
            sourceLeadId,
            timeStamp: new Date(timeStamp).toISOString()
          }
        });
        
        addApiLog(`Form submission created with ID: ${submission.id}`, 'success', 'bookings');
        if (process.env.NODE_ENV !== 'production') {
          console.log('API: Successfully created submission:', submission.id);
        }
        
        // Process email rules for this submission
        try {
          addApiLog(`Processing email rules for submission: ${submission.id}`, 'info', 'bookings');
          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Processing email rules for submission:', submission.id);
          }
          
          // Determine the base URL for the API call
          const baseUrl = process.env.NODE_ENV === 'development' 
            ? `http://localhost:${process.env.PORT || 3000}`
            : process.env.NEXT_PUBLIC_BASE_URL;
          
          addApiLog(`Using base URL for email processing: ${baseUrl}`, 'info', 'bookings');
          
          const emailResponse = await axios.post(
            `${baseUrl}/api/emails/process-submission2`,
            {
              formId,
              formData: mappedData,
              submissionId: submission.id
            }
          );
          
          addApiLog(`Email processing response: ${JSON.stringify(emailResponse.data)}`, 'success', 'bookings');
          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Email processing result:', JSON.stringify(emailResponse.data));
          }
        } catch (emailError) {
          addApiLog(`Error processing email rules: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`, 'error', 'bookings');
          console.error('API: Error processing email rules:', emailError);
          if (process.env.NODE_ENV !== 'production') {
            console.error('API: Email processing error details:', {
              message: emailError instanceof Error ? emailError.message : 'Unknown error',
              stack: emailError instanceof Error ? emailError.stack : 'No stack trace',
            });
          }
          // Continue even if email processing fails
        }
        
        // Fetch the updated booking with the new submission
        const updatedBooking = await prisma.booking.findUnique({
          where: { id: booking.id },
          include: {
            form: true,
            submissions: true,
            // Use type assertion to bypass TypeScript's type checking
            // @ts-ignore - 'invoices' exists in the Prisma schema but TypeScript doesn't recognize it yet
            invoices: true
          }
        } as any);
        
        if (!updatedBooking) {
          addApiLog(`Warning: Could not find updated booking with ID: ${booking.id}`, 'info', 'bookings');
          return res.status(201).json({
            ...booking,
            submissionId: submission.id
          });
        }
        
        addApiLog(`Booking updated with submission: ${updatedBooking.id}`, 'success', 'bookings');
        if (process.env.NODE_ENV !== 'production') {
          console.log('API: Successfully created booking with submission:', booking.id);
        }
        return res.status(201).json({
          ...updatedBooking,
          submissionId: submission.id
        });
      } catch (submissionError) {
        addApiLog(`Error creating submission: ${submissionError instanceof Error ? submissionError.message : 'Unknown error'}`, 'error', 'bookings');
        console.error('API: Error creating submission:', submissionError);
        // Continue even if submission creation fails
        // We already have the booking created
      }
    }

    return res.status(201).json(booking);
  } catch (error) {
    addApiLog(`Error creating booking: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'bookings');
    console.error('API: Error creating booking:', error);
    return res.status(500).json({ error: 'Failed to create booking: ' + (error as Error).message });
  }
}

/**
 * Handle PUT requests to update an existing booking
 */
async function handleUpdateBooking(
  req: NextApiRequest, 
  res: NextApiResponse, 
  isPublicContext: boolean,
  user: any
) {
  try {
    const { id, ...updateData } = req.body;

    if (!id) {
      addApiLog('Missing booking ID', 'error', 'bookings');
      return res.status(400).json({ error: 'Missing booking ID' });
    }

    // If date is provided, ensure it's a Date object
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        form: true,
        submissions: true,
        invoices: true
      }
    });

    addApiLog(`Booking updated with ID: ${booking.id}`, 'success', 'bookings');
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: Successfully updated booking:', booking.id);
    }
    return res.status(200).json(booking);
  } catch (error) {
    addApiLog(`Error updating booking: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'bookings');
    console.error('API: Error updating booking:', error);
    return res.status(500).json({ error: 'Failed to update booking: ' + (error as Error).message });
  }
}
