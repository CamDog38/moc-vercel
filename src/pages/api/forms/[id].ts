import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (process.env.NODE_ENV !== 'production') {
    console.log('Form API called for ID:', id, 'Method:', req.method);
  }
  
  let supabase;
  try {
    supabase = createClient(req, res);
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: Supabase client created successfully');
    }
  } catch (clientError) {
    console.error('API: Error creating Supabase client:', clientError);
    return res.status(500).json({ error: 'Failed to initialize authentication client' });
  }

  try {
    // Get user session
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: Attempting to get user session');
    }
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        console.error('API: Auth Error:', authError)
        return res.status(401).json({ error: 'Authentication error' })
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log('API: Session retrieved successfully', session ? 'User is authenticated' : 'No active session');
      }
    } catch (sessionError) {
      console.error('API: Error retrieving session:', sessionError);
      return res.status(500).json({ error: 'Error retrieving session' });
    }

    // For GET requests, we don't require authentication to allow public form access
    let userSession;
    try {
      const { data } = await supabase.auth.getSession();
      userSession = data.session;
      
      if (req.method !== 'GET' && !userSession) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Unauthorized access attempt for non-GET request');
        }
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } catch (sessionError) {
      console.error('API: Error checking session for authorization:', sessionError);
      // For GET requests, we'll continue even if there's a session error
      if (req.method !== 'GET') {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    switch (req.method) {
      case 'GET':
        if (process.env.NODE_ENV !== 'production') {
          console.log('Fetching form from database...');
        }
        const form = await prisma.form.findUnique({
          where: { id: id as string },
          select: {
            id: true,
            name: true,
            description: true,
            fields: true, // Keep legacy fields for backward compatibility
            sections: true, // Keep legacy sections for backward compatibility
            isMultiPage: true,
            type: true,
            isActive: true,
            submissions: true,
            leads: true,
            formSections: {
              include: {
                fields: true
              },
              orderBy: {
                order: 'asc'
              }
            }
          },
        })
        
        if (!form) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('Form not found for ID:', id);
          }
          return res.status(404).json({ error: 'Form not found' })
        }
        
        console.log('Form found:', {
          id: form.id,
          name: form.name,
          sectionsCount: form.formSections?.length,
          fieldsInSections: form.formSections?.map(s => s.fields.length),
          isMultiPage: form.isMultiPage,
          type: form.type
        });
        
        return res.status(200).json(form)

      case 'PUT':
        try {
          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Processing PUT request for form update');
          }
          const { name, description, sections, isMultiPage, isActive, type } = req.body

          // Validate required fields
          if (!name) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('API: Form name is required but was not provided');
            }
            return res.status(400).json({ error: 'Form name is required' })
          }

          console.log('API: Updating form with data:', {
            id,
            name,
            description,
            sectionsCount: sections?.length,
            isMultiPage,
            type
          });

          // Start a transaction to update form and its sections/fields
          try {
            const updatedForm = await prisma.$transaction(async (tx) => {
              if (process.env.NODE_ENV !== 'production') {
                console.log('API: Starting database transaction for form update');
              }
              
              // First, update the form basic info
              if (process.env.NODE_ENV !== 'production') {
                console.log('API: Updating form basic info');
              }
              const form = await tx.form.update({
                where: { id: id as string },
                data: {
                  name,
                  description,
                  isMultiPage: isMultiPage || false,
                  isActive,
                  type: type || 'INQUIRY',
                },
              })
              
              if (process.env.NODE_ENV !== 'production') {
                console.log('API: Form basic info updated successfully');
              }

              // Delete existing fields first, then sections
              if (process.env.NODE_ENV !== 'production') {
                console.log('API: Deleting existing form fields');
              }
              
              // First get all section IDs for this form
              const sectionIds = await tx.formSection.findMany({
                where: { formId: id as string },
                select: { id: true }
              }).then(sections => sections.map(s => s.id));
              
              // Then delete all fields that belong to these sections
              await tx.formField.deleteMany({
                where: {
                  sectionId: {
                    in: sectionIds
                  }
                }
              });
              
              if (process.env.NODE_ENV !== 'production') {
                console.log('API: Existing form fields deleted successfully');
              }
              
              // Now delete the sections
              if (process.env.NODE_ENV !== 'production') {
                console.log('API: Deleting existing form sections');
              }
              await tx.formSection.deleteMany({
                where: { formId: id as string },
              })
              
              if (process.env.NODE_ENV !== 'production') {
                console.log('API: Existing form sections deleted successfully');
              }

              // Create new sections and fields in batches
              if (sections && sections.length > 0) {
                if (process.env.NODE_ENV !== 'production') {
                  console.log(`API: Creating ${sections.length} new form sections`);
                }
                
                // Process sections in batches of 2 to avoid transaction timeouts
                const BATCH_SIZE = 2;
                for (let i = 0; i < sections.length; i += BATCH_SIZE) {
                  const batch = sections.slice(i, i + BATCH_SIZE);
                  if (process.env.NODE_ENV !== 'production') {
                    console.log(`API: Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(sections.length/BATCH_SIZE)}`);
                  }
                  
                  for (const section of batch) {
                    if (process.env.NODE_ENV !== 'production') {
                      console.log(`API: Creating section ${i+1}/${sections.length}: ${section.title}`);
                    }
                    
                    try {
                      const createdSection = await tx.formSection.create({
                        data: {
                          formId: id as string,
                          title: section.title,
                          description: section.description,
                          order: i,
                          isPage: section.isPage || false,
                          fields: {
                            create: section.fields.map((field: any, index: number) => ({
                              type: field.type,
                              label: field.label,
                              placeholder: field.placeholder,
                              helpText: field.helpText,
                              required: field.required || false,
                              options: field.options || null,
                              validation: field.validation || null,
                              excludeTime: field.excludeTime || false,
                              mapping: field.mapping || null,
                              order: index,
                              // Preserve the stable ID if it exists
                              ...(field.stableId ? { stableId: field.stableId } : {})
                            }))
                          }
                        },
                      })
                      if (process.env.NODE_ENV !== 'production') {
                        console.log(`API: Section ${i+1} created with ${section.fields?.length || 0} fields`);
                      }
                    } catch (sectionError) {
                      console.error(`API: Error creating section ${i+1}:`, sectionError);
                      throw sectionError;
                    }
                  }
                }
              } else {
                if (process.env.NODE_ENV !== 'production') {
                  console.log('API: No sections to create');
                }
              }

              if (process.env.NODE_ENV !== 'production') {
                console.log('API: Form update transaction completed successfully');
              }
              return form;
            }, {
              timeout: 30000, // Increase timeout to 30 seconds
              maxWait: 35000, // Maximum time to wait for transaction to start
            });

            if (process.env.NODE_ENV !== 'production') {
              console.log('API: Form updated successfully:', updatedForm);
            }
            return res.status(200).json(updatedForm);
          } catch (transactionError: any) {
            console.error('API: Error in form update transaction:', transactionError);
            // Log detailed error information for debugging
            console.error('Path: /api/forms/[id]', 'API: Error updating form:', {
              formId: id,
              error: {
                message: transactionError.message,
                code: transactionError.code,
                stack: transactionError.stack,
                name: transactionError.name
              }
            });
            return res.status(500).json({ 
              error: 'Failed to update form', 
              details: transactionError.message,
              code: transactionError.code
            });
          }
        } catch (putError: any) {
          console.error('API: Error processing PUT request:', putError);
          return res.status(500).json({ 
            error: 'Error processing form update request',
            details: putError.message
          });
        }

      case 'DELETE':
        try {
          if (process.env.NODE_ENV !== 'production') {
            console.log('Attempting to delete form:', id);
          }
          
          // Start a transaction for the deletion process
          await prisma.$transaction(async (tx) => {
            // First check if there are any associated bookings
            const bookingsCount = await tx.booking.count({
              where: { formId: id as string }
            });

            if (bookingsCount > 0) {
              throw new Error(`Cannot delete form that has ${bookingsCount} associated bookings. Please delete the bookings first.`);
            }

            // If no bookings exist, proceed with deletion
            // Delete form submissions
            await tx.formSubmission.deleteMany({
              where: { formId: id as string }
            });

            // Delete leads
            await tx.lead.deleteMany({
              where: { formId: id as string }
            });

            // Delete form fields (need to delete them first due to foreign key constraints)
            // First get all section IDs for this form
            const sectionIds = await tx.formSection.findMany({
              where: { formId: id as string },
              select: { id: true }
            }).then(sections => sections.map(s => s.id));
            
            // Then delete all fields that belong to these sections
            await tx.formField.deleteMany({
              where: {
                sectionId: {
                  in: sectionIds
                }
              }
            });

            // Delete form sections
            await tx.formSection.deleteMany({
              where: { formId: id as string }
            });

            // Finally delete the form itself
            await tx.form.delete({
              where: { id: id as string }
            });
          });

          if (process.env.NODE_ENV !== 'production') {
            console.log('Form deleted successfully:', id);
          }
          return res.status(204).end();
        } catch (error: any) {
          console.error('Error handling form request:', error);
          // Log detailed error information
          console.error('Path: /api/forms/[id]', '[DELETE] Error during form deletion:', {
            formId: id,
            error: {
              message: error.message,
              stack: error.stack
            }
          });
          
          // Return appropriate error message to client
          if (error.message.includes('associated bookings')) {
            return res.status(400).json({ error: error.message });
          }
          return res.status(500).json({ error: 'Failed to delete form' });
        }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Form API Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}