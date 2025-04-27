import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';
import { addApiLog } from '../debug/logs';

interface FormField {
  id: string;
  label: string;
  type: string;
  options?: string[];
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

interface BookingWithDetails {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  form: {
    name: string;
    formSections: FormSection[];
  };
  submissions: any[];
  invoices: any[];
  assignedTo?: any;
  date: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get the booking ID from the URL
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  // Check if we're in a public context (no authentication required)
  // Public context can be set via header or by checking the referer for lead forms
  const { shouldTreatAsPublicContext } = require('@/util/public-context');
  const isPublicContext = shouldTreatAsPublicContext(req);
  
  const isPublicContextHeader = req.headers['x-public-context'] === 'true';
  const referer = req.headers.referer || '';
  const isLeadFormReferer = referer.includes('/forms/') || referer.includes('/leads/');
  
  addApiLog(`Fetching booking with ID: ${id}, Public context: ${isPublicContext} (header: ${isPublicContextHeader}, lead form referer: ${isLeadFormReferer})`, 'info', 'bookings');
  if (process.env.NODE_ENV !== 'production') {
    console.log('API: Fetching booking with ID:', id, 'Public context:', isPublicContext, 'Referer:', referer);
  }

  // Only get the user session if not in public context
  let session = null;
  if (!isPublicContext) {
    try {
      const supabase = createClient(req, res);
      const { data } = await supabase.auth.getSession();
      session = data.session;
      
      if (!session) {
        addApiLog('No session found in non-public context', 'error', 'bookings');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } catch (error) {
      addApiLog(`Error getting session: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'bookings');
      console.error('API: Error getting session:', error);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    addApiLog('Public context access, skipping authentication', 'info', 'bookings');
  }

  switch (req.method) {
    case 'GET':
      try {
        // Fetch the booking
        // Use type assertion to work around Prisma client type issues
        // First convert to unknown to avoid TypeScript errors
        const booking = await (prisma.booking.findUnique({
          where: { id },
          include: {
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
            submissions: true,
            // Use type assertion to bypass TypeScript's type checking
            // @ts-ignore - 'invoices' exists in the Prisma schema but TypeScript doesn't recognize it yet
            invoices: true,
            assignedTo: {
              select: {
                id: true,
                email: true,
                marriageOfficer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    title: true
                  }
                }
              }
            }
          },
        }) as unknown as BookingWithDetails);

        if (!booking) {
          addApiLog(`Booking not found with ID: ${id}`, 'error', 'bookings');
          return res.status(404).json({ error: 'Booking not found' });
        }

        // Transform the response to match the frontend interface
        const transformedBooking = {
          ...booking,
          form: {
            ...booking.form,
            sections: (booking.form.formSections || []).map((section: FormSection) => ({
              id: section.id,
              title: section.title,
              description: section.description,
              fields: section.fields.map((field: FormField) => ({
                id: field.id,
                label: field.label,
                type: field.type,
                options: field.options
              }))
            }))
          }
        };

        // Check if user is authenticated and has access to this booking
        if (!isPublicContext && session) {
          try {
            const user = session.user;
            
            // Ensure user exists in the database
            let dbUser;
            try {
              dbUser = await ensureUserExists(user);
            } catch (error) {
              console.error('Failed to ensure user exists:', error);
              return res.status(401).json({ error: 'Failed to verify user in database' });
            }
            
            // If user is an admin or super admin, they have access
            if (dbUser.role === 'ADMIN' || dbUser.role === 'SUPER_ADMIN') {
              // Admin has access, continue
              addApiLog(`Admin user ${user.id} accessed booking ${id}`, 'info', 'bookings');
            } 
            // If user is a marriage officer, check if they have access to this booking
            else if (dbUser.role === 'MARRIAGE_OFFICER') {
              // Check if this booking has an invoice assigned to this officer
              const officer = await prisma.marriageOfficer.findUnique({
                where: { userId: user.id }
              });
              
              if (!officer) {
                addApiLog(`Marriage officer record not found for user ${user.id}`, 'error', 'bookings');
                return res.status(403).json({ error: 'Marriage officer record not found' });
              }
              
              // Check if there's an invoice for this booking assigned to this officer
              const invoice = await prisma.invoice.findUnique({
                where: { bookingId: id }
              });
              
              if (!invoice || invoice.officerId !== officer.id) {
                addApiLog(`User ${user.id} does not have permission to view booking ${id}`, 'error', 'bookings');
                return res.status(403).json({ error: 'You do not have permission to view this booking' });
              }
              
              addApiLog(`Marriage officer ${user.id} accessed assigned booking ${id}`, 'info', 'bookings');
            } 
            // Any other role doesn't have access
            else {
              addApiLog(`User ${user.id} with role ${dbUser.role} attempted to access booking ${id}`, 'error', 'bookings');
              return res.status(403).json({ error: 'You do not have permission to view this booking' });
            }
          } catch (error) {
            console.error('API: Error checking permissions:', error);
            return res.status(500).json({ error: 'Error checking permissions' });
          }
        } else if (isPublicContext) {
          addApiLog(`Public access granted to booking ${id}`, 'info', 'bookings');
          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Public context access granted for booking:', id);
          }
        }

        addApiLog(`Successfully retrieved booking ${id}`, 'success', 'bookings');
        return res.status(200).json(transformedBooking);
      } catch (error) {
        console.error('API: Error fetching booking:', error);
        return res.status(500).json({ error: 'Failed to fetch booking: ' + (error as Error).message });
      }

    case 'PUT':
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.log('API: PUT /api/bookings/[id] - Request body:', JSON.stringify(req.body));
        }
        
        // Ensure user is authenticated
        if (!session) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = session.user;
        if (process.env.NODE_ENV !== 'production') {
          console.log('API: User attempting to update booking:', user.id);
        }
        
        // Check if user is an admin or has special roles
        const userRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true }
        });
        
        const isAdmin = userRecord?.role === 'ADMIN' || userRecord?.role === 'SUPER_ADMIN';
        if (process.env.NODE_ENV !== 'production') {
          console.log('API: User is admin:', isAdmin);
        }
        
        // Get the booking to check permissions
        const existingBooking = await prisma.booking.findUnique({
          where: { id },
          select: { 
            assignedUserId: true,
            id: true,
            date: true,
            time: true,
            location: true
          }
        });
        
        if (!existingBooking) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Booking not found with ID:', id);
          }
          return res.status(404).json({ error: 'Booking not found' });
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('API: Found existing booking:', JSON.stringify(existingBooking));
        }
        
        // Check if user is the assigned user for this booking
        const isAssignedUser = existingBooking.assignedUserId === user.id;
        if (process.env.NODE_ENV !== 'production') {
          console.log('API: User is assigned to booking:', isAssignedUser);
        }
        
        // Check if this is an invoice-related update (only contains date, time, location)
        const isInvoiceUpdate = Object.keys(req.body).every(key => 
          ['date', 'time', 'location'].includes(key)
        );
        if (process.env.NODE_ENV !== 'production') {
          console.log('API: Is invoice-related update:', isInvoiceUpdate);
        }
        
        // If not admin or assigned user, and not an invoice update, deny access
        if (!isAdmin && !isAssignedUser && !isInvoiceUpdate) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Permission denied - not admin or assigned user, and not an invoice update');
          }
          return res.status(403).json({ error: 'You do not have permission to update this booking' });
        }

        // Update the booking
        const { status, ...data } = req.body;
        if (process.env.NODE_ENV !== 'production') {
          console.log('API: Updating booking with data:', JSON.stringify(data));
        }
        
        try {
          const updatedBooking = await prisma.booking.update({
            where: { id },
            data: {
              ...data,
              status: isAdmin ? status : undefined
            },
            include: {
              form: true,
              submissions: true,
              invoices: true
            } as any // Type assertion to bypass Prisma client type checking
          });
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Booking updated successfully');
          }
          return res.status(200).json(updatedBooking);
        } catch (updateError) {
          console.error('API: Error in Prisma update operation:', updateError);
          return res.status(500).json({ 
            error: 'Failed to update booking in database',
            details: updateError instanceof Error ? updateError.message : 'Unknown error'
          });
        }
      } catch (error) {
        console.error('API: Error updating booking:', error);
        return res.status(500).json({ 
          error: 'Failed to update booking',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
