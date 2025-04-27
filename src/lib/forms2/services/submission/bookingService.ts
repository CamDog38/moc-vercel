import { PrismaClient } from '@prisma/client';
import * as logger from '@/util/logger';
import { validateBookingFields } from '@/lib/forms2/services/validation';

const prisma = new PrismaClient();

/**
 * Processes datetime information from form data
 * @param mappedData The mapped form data
 * @returns Processed date and time information
 */
export const processBookingDateTime = (
  mappedData: Record<string, any>
): { bookingDate: Date; bookingTime: string | null } => {
  let bookingDate: Date;
  let bookingTime: string | null = null;
  
  if (mappedData.datetime) {
    try {
      const dateTimeObj = new Date(mappedData.datetime);
      bookingDate = dateTimeObj;
      const hours = dateTimeObj.getHours();
      const minutes = dateTimeObj.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      bookingTime = `${formattedHours}:${formattedMinutes} ${ampm}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error parsing datetime: ' + errorMessage, 'forms');
      throw new Error('Invalid date and time format. Please select a valid date and time.');
    }
  } else {
    // If no date is provided, use the current date instead of throwing an error
    if (!mappedData.date) {
      logger.info('No date provided for booking form submission, using current date', 'forms');
      bookingDate = new Date();
    } else {
      bookingDate = new Date(mappedData.date);
    }
    
    bookingTime = mappedData.time;
  }
  
  return { bookingDate, bookingTime };
};

/**
 * Creates a booking from the mapped form data
 * @param formId The form ID
 * @param mappedData The mapped form data
 * @returns The created booking ID
 */
export const createBookingFromFormData = async (
  formId: string,
  mappedData: Record<string, any>,
  rawFormData?: Record<string, any>
): Promise<string> => {
  logger.info(`Creating booking for booking form: ${formId}`, 'forms');
  
  // If we have raw form data, try to extract missing fields directly from it
  if (rawFormData && (!mappedData.email || !mappedData.name || !mappedData.phone || !mappedData.date)) {
    logger.info(`Attempting to extract missing fields from raw form data`, 'forms');
    
    // Extract fields from raw form data
    for (const [fieldId, value] of Object.entries(rawFormData)) {
      if (!value || typeof value !== 'string') continue;
      
      // Look for email fields
      if (!mappedData.email && (
          fieldId.toLowerCase().includes('email') || 
          (typeof value === 'string' && value.includes('@') && value.includes('.'))
      )) {
        mappedData.email = value;
        logger.info(`Extracted email from raw data: ${value}`, 'forms');
      }
      
      // Look for name fields
      if (!mappedData.name && (
          fieldId.toLowerCase().includes('name') && 
          !fieldId.toLowerCase().includes('last') && 
          !fieldId.toLowerCase().includes('first')
      )) {
        mappedData.name = value;
        logger.info(`Extracted name from raw data: ${value}`, 'forms');
      }
      
      // Look for phone fields
      if (!mappedData.phone && (
          fieldId.toLowerCase().includes('phone') || 
          fieldId.toLowerCase().includes('tel')
      )) {
        mappedData.phone = value;
        logger.info(`Extracted phone from raw data: ${value}`, 'forms');
      }
      
      // Look for date fields
      if (!mappedData.date && (
          fieldId.toLowerCase().includes('date') ||
          (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))
      )) {
        mappedData.date = value;
        logger.info(`Extracted date from raw data: ${value}`, 'forms');
      }
    }
  }
  
  // Validate booking fields
  validateBookingFields(mappedData);
  
  // Process date and time
  const { bookingDate, bookingTime } = processBookingDateTime(mappedData);
  
  // Get location information
  const bookingLocation = mappedData.location || mappedData.location_office || null;
  
  // Extract email, name, and phone from the mapped data
  const email = mappedData.email || '';
  const name = mappedData.name || '';
  const phone = mappedData.phone || null;
  
  // Email and name are required for bookings according to the schema
  if (!email) throw new Error('Email is required for bookings');
  if (!name) throw new Error('Name is required for bookings');
  
  logger.info(`Creating booking with: email=${email}, name=${name}, phone=${phone}, date=${bookingDate}, time=${bookingTime}, location=${bookingLocation}`, 'forms');
  
  // Create the booking
  const booking = await prisma.booking.create({
    data: {
      email,
      name,
      phone,
      date: bookingDate,
      time: bookingTime,
      location: bookingLocation,
      formId,
      status: 'PENDING',
    },
  });
  
  logger.info(`Booking created: ${booking.id}`, 'forms');
  return booking.id;
};
