import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'
import { ensureUserExists } from '@/util/auth-helpers'
import { withCors } from '@/util/cors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Initialize Supabase client for auth
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: Initializing Supabase client...');
    }
    const supabase = createClient(req, res)
    
    // Get authenticated user
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: Getting authenticated user...');
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('API: Authentication error:', authError);
      return res.status(401).json({ error: 'Authentication failed: ' + authError.message })
    }
    
    if (!user) {
      console.error('API: No user found');
      return res.status(401).json({ error: 'No authenticated user found' })
    }

    // Ensure user exists in the database
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: Ensuring user exists in database...');
    }
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
    } catch (error) {
      console.error('API: Failed to ensure user exists:', error);
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('API: Authenticated user:', user.id, 'Role:', dbUser.role);
    }

    switch (req.method) {
      case 'GET':
        try {
          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Starting forms fetch');
          }
          
          // Get all forms or filter by query params
          const forms = await prisma.form.findMany({
            where: {
              isActive: true,
              ...(req.query.userId && { userId: req.query.userId as string }),
              // If user is not admin, only show their forms
              ...(dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN' && { userId: user.id }),
            },
            include: {
              formSections: {
                include: {
                  fields: true
                },
                orderBy: {
                  order: 'asc'
                }
              },
              bookings: {
                select: {
                  id: true,
                  status: true,
                  date: true,
                  name: true,
                  email: true
                }
              },
              leads: {
                select: {
                  id: true,
                  status: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              updatedAt: 'desc'
            }
          });

          // Filter out Form System 2.0 forms
          const legacyForms = forms.filter(form => {
            try {
              // Explicit check: If the form name contains '2.0', it's a Form 2.0 form
              // This handles cases where the form might not have proper version metadata
              if (form.name.includes('2.0')) {
                return false;
              }
              
              if (!form.fields) return true; // If no fields, assume it's a legacy form
              
              // Parse fields if it's a string
              let fieldsObj;
              if (typeof form.fields === 'string') {
                fieldsObj = JSON.parse(form.fields);
              } else {
                fieldsObj = form.fields;
              }
              
              // If it has version 2.0, it's not a legacy form
              return !fieldsObj.version || fieldsObj.version !== '2.0';
            } catch (e) {
              console.error('API: Error parsing form fields:', e, form.id);
              return true; // If error parsing, assume it's a legacy form
            }
          });

          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Successfully fetched legacy forms:', legacyForms.length, 'out of', forms.length, 'total forms');
          }
          return res.status(200).json(legacyForms);
        } catch (error) {
          console.error('API: Error fetching forms:', error);
          return res.status(500).json({ error: 'Failed to fetch forms: ' + (error as Error).message });
        }

      case 'POST':
        try {
          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Processing form creation...');
          }
          const { name, description, sections, fields, type, isMultiPage } = req.body;

          if (!name) {
            return res.status(400).json({ error: 'Name is required' });
          }

          // Start a transaction to create form with sections and fields
          const newForm = await prisma.$transaction(async (tx) => {
            // Create the form
            const form = await tx.form.create({
              data: {
                name,
                description,
                type: type || 'BOOKING',
                userId: user.id,
                isMultiPage: isMultiPage || false,
              },
            });

            // Create sections and fields
            if (sections && sections.length > 0) {
              await Promise.all(sections.map(async (section: any, index: number) => {
                await tx.formSection.create({
                  data: {
                    formId: form.id,
                    title: section.title,
                    description: section.description,
                    order: index,
                    fields: {
                      create: section.fields.map((field: any, fieldIndex: number) => ({
                        ...field,
                        order: fieldIndex,
                      })),
                    },
                  },
                });
              }));
            } else if (fields && fields.length > 0) {
              // If no sections provided but fields are, create a default section
              await tx.formSection.create({
                data: {
                  formId: form.id,
                  title: 'Default Section',
                  order: 0,
                  fields: {
                    create: fields.map((field: any, index: number) => ({
                      ...field,
                      order: index,
                    })),
                  },
                },
              });
            }

            return form;
          }, {
            timeout: 30000, // Increase timeout to 30 seconds
            maxWait: 35000, // Maximum time to wait for transaction to start
          });

          if (process.env.NODE_ENV !== 'production') {
            console.log('API: Form created successfully:', newForm.id);
          }
          return res.status(201).json(newForm);
        } catch (error) {
          console.error('API: Error creating form:', error);
          return res.status(500).json({ error: 'Failed to create form: ' + (error as Error).message });
        }

      default:
        if (process.env.NODE_ENV !== 'production') {
          console.log('API: Method not allowed:', req.method);
        }
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API: Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + (error as Error).message });
  }
}

// Export the handler with CORS middleware
export default withCors(handler, {
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  maxAge: 86400, // 24 hours
});