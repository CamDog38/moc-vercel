import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'

// Type definition for form fields
interface FormFieldWithStableId {
  id: string;
  sectionId: string;
  type: string;
  label: string;
  placeholder?: string | null;
  helpText?: string | null;
  required: boolean;
  options?: any | null;
  validation?: any | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  excludeTime: boolean;
  mapping?: string | null;
  conditionalLogic?: any | null;
  stableId?: string | null;
  inUseByRules?: boolean;
}

interface FormSectionWithStableIdFields {
  id: string;
  formId: string;
  title: string;
  description?: string | null;
  order: number;
  isPage: boolean;
  createdAt: Date;
  updatedAt: Date;
  fields: FormFieldWithStableId[];
}

// Type definition for conditional logic
interface ConditionalLogic {
  value: string;
  action: string;
  fieldId: string;
  operator: string;
}

// Helper function to check if an object has the shape of ConditionalLogic
function isValidConditionalLogic(obj: any): obj is ConditionalLogic {
  return obj && 
    typeof obj === 'object' && 
    typeof obj.fieldId === 'string' &&
    typeof obj.action === 'string';
}

// Helper function to update conditional logic references in a separate request after transaction
async function updateConditionalLogicReferences(
  formId: string, 
  fieldIdMapping: Record<string, string>
) {
  try {
    // Get all fields for this form
    const formSections = await prisma.formSection.findMany({
      where: { formId },
      include: { fields: true }
    });
    
    // Flatten fields array
    const fields = formSections.flatMap(section => section.fields);
    
    // Update each field that has conditional logic
    for (const field of fields) {
      if (field.conditionalLogic) {
        const conditionalLogic = field.conditionalLogic as any;
        
        // Check if this conditional logic references a field ID that was remapped
        if (
          isValidConditionalLogic(conditionalLogic) && 
          conditionalLogic.fieldId in fieldIdMapping
        ) {
          // Create updated conditional logic with the new field ID
          const updatedConditionalLogic = {
            ...conditionalLogic,
            fieldId: fieldIdMapping[conditionalLogic.fieldId]
          };
          
          // Update the field with the new conditional logic
          await prisma.formField.update({
            where: { id: field.id },
            data: { conditionalLogic: updatedConditionalLogic }
          });
          
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Updated conditional logic reference: ${conditionalLogic.fieldId} -> ${updatedConditionalLogic.fieldId}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error updating conditional logic references:", error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Form ID is required' })
  }

  switch (req.method) {
    case 'GET':
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.log('API: Fetching form:', id);
        }
        const form = await prisma.form.findUnique({
          where: { id },
          include: {
            formSections: {
              include: {
                fields: true,
              },
              orderBy: {
                order: 'asc'
              }
            }
          }
        });

        if (!form) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Form not found:', id);
          }
          return res.status(404).json({ error: 'Form not found' });
        }

        // For non-public routes, verify authentication
        if (!form.isActive) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Form is inactive, checking auth...');
          }
          // Initialize Supabase client for auth
          const supabase = createClient(req, res);
          
          // Get authenticated user
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          
          if (authError || !user) {
            console.error('API: Auth error:', authError);
            return res.status(401).json({ error: 'Unauthorized' });
          }

          // Get the user's role
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true }
          });

          if (!dbUser) {
            console.error('API: User not found in database:', user.id);
            return res.status(401).json({ error: 'User not found in database' });
          }

          // Only allow admin/super_admin or form owner to view inactive forms
          if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN' && form.userId !== user.id) {
            console.error('API: User not authorized to view inactive form:', user.id);
            return res.status(403).json({ error: 'Not authorized to view this form' });
          }
        }

        // Sort fields within sections
        if (form.formSections) {
          form.formSections.forEach(section => {
            if (section.fields) {
              section.fields.sort((a, b) => a.order - b.order);
            }
          });
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('API: Successfully fetched form:', id);
        }
        return res.status(200).json(form);
      } catch (error) {
        console.error('API: Error fetching form:', error);
        return res.status(500).json({ error: 'Failed to fetch form' });
      }

    case 'PUT':
      try {
        // Initialize Supabase client for auth
        const supabase = createClient(req, res);
        
        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.error('API: Auth error:', authError);
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { name, description, sections, type, isMultiPage } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Name is required' });
        }

        // Get the user's role
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true }
        });

        if (!dbUser) {
          console.error('API: User not found in database:', user.id);
          return res.status(401).json({ error: 'User not found in database' });
        }

        // Check if user has permission to update this form
        const existingForm = await prisma.form.findUnique({
          where: { id },
          include: {
            formSections: {
              include: {
                fields: true
              }
            }
          }
        });

        if (!existingForm) {
          return res.status(404).json({ error: 'Form not found' });
        }

        if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN' && existingForm.userId !== user.id) {
          return res.status(403).json({ error: 'Not authorized to update this form' });
        }

        // Log the incoming sections data for debugging
        if (process.env.NODE_ENV !== 'production') {
          console.log('API: Updating form with sections:', JSON.stringify(sections, null, 2));
        }

        // Create a mapping of field IDs for tracking field references
        const fieldIdMapping: Record<string, string> = {};

        // Update form and its sections/fields in a transaction
        const updatedForm = await prisma.$transaction(async (tx) => {
          // Update the form
          const form = await tx.form.update({
            where: { id },
            data: {
              name,
              description,
              type: type || 'BOOKING',
              isMultiPage: isMultiPage || false,
            },
          });

          // Delete existing sections and fields
          await tx.formField.deleteMany({
            where: {
              section: {
                formId: id
              }
            }
          });

          await tx.formSection.deleteMany({
            where: {
              formId: id
            }
          });

          // Create new sections and fields
          if (sections && sections.length > 0) {
            await Promise.all(sections.map(async (section: any, sectionIndex: number) => {
              // Use section.order if available, otherwise use index
              const sectionOrder = section.order !== undefined ? section.order : sectionIndex;
              
              const newSection = await tx.formSection.create({
                data: {
                  formId: form.id,
                  title: section.title,
                  description: section.description,
                  order: sectionOrder,
                },
              });
              
              // Create fields for this section
              if (section.fields && section.fields.length > 0) {
                await Promise.all(section.fields.map(async (field: any, fieldIndex: number) => {
                  // Use field.order if available, otherwise use index
                  const fieldOrder = field.order !== undefined ? field.order : fieldIndex;
                  
                  // When a field is recreated, we need to track its old ID to update references
                  const oldId = field.id;
                  
                  // Debug the conditionalLogic value
                  if (process.env.NODE_ENV !== 'production') {
                    console.log(`Field ${field.label} conditionalLogic value:`, JSON.stringify(field.conditionalLogic));
                    console.log(`Field conditionalLogic type:`, typeof field.conditionalLogic);
                  }
                  
                  // Explicitly map each field property to ensure conditional logic is preserved
                  const newField = await tx.formField.create({
                    data: {
                      sectionId: newSection.id,
                      type: field.type,
                      label: field.label,
                      placeholder: field.placeholder || '',
                      helpText: field.helpText || null,
                      required: field.required || false,
                      options: field.options || null,
                      validation: field.validation || null,
                      order: fieldOrder,
                      excludeTime: field.excludeTime || false,
                      mapping: field.mapping || null,
                      // Preserve the stableId if it exists, otherwise let database generate it
                      ...(field.stableId ? { stableId: field.stableId } : {}),
                      // Handle explicit removal of conditional logic
                      // If conditionalLogic is null, undefined, or an empty object, it should be set to null
                      conditionalLogic: field.conditionalLogic === null || 
                                       field.conditionalLogic === undefined || 
                                       (typeof field.conditionalLogic === 'object' && 
                                        Object.keys(field.conditionalLogic).length === 0)
                                       ? null 
                                       : field.conditionalLogic
                    },
                  });
                  
                  // If this field had an ID before, track the mapping
                  if (oldId) {
                    fieldIdMapping[oldId] = newField.id;
                  }
                }));
              }
            }));
          }

          // Return form with updated sections and fields, properly ordered
          return await tx.form.findUnique({
            where: { id: form.id },
            include: {
              formSections: {
                include: {
                  fields: true,
                },
                orderBy: {
                  order: 'asc'
                }
              }
            }
          });
        }, {
          timeout: 30000, // Increase timeout to 30 seconds
          maxWait: 35000, // Maximum time to wait for transaction to start
        });

        // Update conditional logic references after the transaction
        // This is done separately to avoid complex nested transactions
        await updateConditionalLogicReferences(id, fieldIdMapping);

        // Sort fields within sections after retrieving the form
        if (updatedForm?.formSections) {
          updatedForm.formSections.forEach(section => {
            if (section.fields) {
              section.fields.sort((a, b) => a.order - b.order);
            }
          });
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('API: Successfully updated form:', id);
        }
        return res.status(200).json(updatedForm);
      } catch (error) {
        console.error('API: Error updating form:', error);
        return res.status(500).json({ error: 'Failed to update form' });
      }

    case 'DELETE':
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[DELETE] Starting deletion of form ${id}`);
        }
        
        // First check if form exists
        const existingForm = await prisma.form.findUnique({
          where: { id },
          include: {
            formSections: {
              include: {
                fields: true
              }
            }
          }
        })

        if (!existingForm) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[DELETE] Form ${id} not found`);
          }
          return res.status(404).json({ error: 'Form not found' })
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log(`[DELETE] Found form with ${existingForm.formSections.length} sections`);
        }
        
        // Delete form and all related records in a transaction
        await prisma.$transaction(async (tx) => {
          // First delete all form submissions
          const submissionsResult = await tx.formSubmission.deleteMany({
            where: { formId: id }
          })
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[DELETE] Deleted ${submissionsResult.count} form submissions`);
          }

          // Delete all leads associated with this form
          const leadsResult = await tx.lead.deleteMany({
            where: { formId: id }
          })
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[DELETE] Deleted ${leadsResult.count} leads`);
          }

          // Delete all form fields
          const fieldsResult = await tx.formField.deleteMany({
            where: {
              section: {
                formId: id
              }
            }
          })
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[DELETE] Deleted ${fieldsResult.count} form fields`);
          }

          // Delete all form sections
          const sectionsResult = await tx.formSection.deleteMany({
            where: { formId: id }
          })
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[DELETE] Deleted ${sectionsResult.count} form sections`);
          }

          // Check for any bookings
          const bookingsCount = await tx.booking.count({
            where: { formId: id }
          })
          
          if (bookingsCount > 0) {
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[DELETE] Cannot delete form ${id} - has ${bookingsCount} associated bookings`);
            }
            throw new Error(`Cannot delete form that has ${bookingsCount} associated bookings. Please delete the bookings first.`)
          }

          // Finally delete the form itself
          await tx.form.delete({
            where: { id }
          })
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[DELETE] Successfully deleted form ${id}`);
          }
        }, {
          timeout: 30000, // Increase timeout to 30 seconds
          maxWait: 35000, // Maximum time to wait for transaction to start
        });
        
        return res.status(204).end()
      } catch (error) {
        console.error('[DELETE] Error during form deletion:', {
          formId: id,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack
          } : error
        })
        throw error // Re-throw to be caught by the outer try-catch
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
