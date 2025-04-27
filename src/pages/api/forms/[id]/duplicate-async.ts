import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'
import { ensureUserExists } from '@/util/auth-helpers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const jobId = req.query.jobId as string;
  
  // Handle GET requests to check job status
  if (req.method === 'GET' && jobId) {
    try {
      // Look up the job in the database
      const job = await prisma.backgroundJob.findUnique({
        where: { id: jobId }
      });
      
      if (!job) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[DUPLICATE-ASYNC] Job ${jobId} not found in database`);
        }
        return res.status(404).json({ error: 'Job not found' });
      }
      
      // Parse the metadata from the job
      let metadata = {};
      try {
        if (job.metadata) {
          metadata = JSON.parse(job.metadata as string);
        }
      } catch (parseError) {
        console.error(`[DUPLICATE-ASYNC] Error parsing job metadata:`, parseError);
      }
      
      return res.status(200).json({
        status: job.status,
        progress: metadata.progress || 0,
        formId: job.resourceId,
        newFormId: metadata.newFormId,
        error: job.error || undefined
      });
    } catch (error) {
      console.error(`[DUPLICATE-ASYNC] Error retrieving job ${jobId}:`, error);
      return res.status(500).json({ error: 'Failed to retrieve job status' });
    }
  }
  
  // Only allow POST requests for starting duplication
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'GET'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    // Initialize Supabase client for auth
    const supabase = createClient(req, res)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      return res.status(401).json({ error: 'Authentication failed: ' + authError.message })
    }
    
    if (!user) {
      return res.status(401).json({ error: 'No authenticated user found' })
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
    } catch (error) {
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    // Get the original form basic info (without sections and fields to keep it fast)
    const originalForm = await prisma.form.findUnique({
      where: { id: id as string },
    });

    if (!originalForm) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Check if user has permission to duplicate this form
    if (originalForm.userId !== user.id && dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'You do not have permission to duplicate this form' });
    }
    
    // Create the new form first
    const newForm = await prisma.form.create({
      data: {
        name: `Copy of ${originalForm.name}`,
        description: originalForm.description,
        type: originalForm.type,
        userId: user.id, // Assign to the current user
        isMultiPage: originalForm.isMultiPage,
        isActive: originalForm.isActive,
      },
    });

    // Create a job ID for this duplication
    const newJobId = `dup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a job record in the database
    await prisma.backgroundJob.create({
      data: {
        id: newJobId,
        type: 'FORM_DUPLICATION',
        status: 'pending',
        resourceId: id as string,
        metadata: JSON.stringify({
          progress: 0,
          newFormId: newForm.id
        }),
        createdAt: new Date()
      }
    });

    // Start the duplication process in the background
    processDuplication(newJobId, id as string, newForm.id, user.id);

    // Return immediately with the job ID and new form ID
    return res.status(202).json({ 
      jobId: newJobId, 
      formId: newForm.id,
      message: 'Form duplication started. You can check the status using the jobId.'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to start form duplication: ' + (error as Error).message });
  }
}

// Process the duplication in the background
async function processDuplication(jobId: string, originalFormId: string, newFormId: string, userId: string) {
  try {
    // Update job status to processing
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { 
        status: 'processing',
        metadata: JSON.stringify({
          progress: 0,
          newFormId: newFormId
        })
      }
    });
    
    // Get the original form with all its sections and fields
    const originalForm = await prisma.form.findUnique({
      where: { id: originalFormId },
      include: {
        formSections: {
          include: {
            fields: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!originalForm || !originalForm.formSections) {
      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: { 
          status: 'failed',
          error: 'Could not find original form details',
          completedAt: new Date()
        }
      });
      return;
    }

    const totalSections = originalForm.formSections.length;
    let completedSections = 0;

    // Process sections one by one
    for (const section of originalForm.formSections) {
      try {
        const newSection = await prisma.formSection.create({
          data: {
            formId: newFormId,
            title: section.title,
            description: section.description || '',
            order: section.order,
            isPage: section.isPage,
          },
        });
        
        // Process fields in batches
        if (section.fields && section.fields.length > 0) {
          const BATCH_SIZE = 10;
          const totalBatches = Math.ceil(section.fields.length / BATCH_SIZE);
          
          for (let i = 0; i < section.fields.length; i += BATCH_SIZE) {
            const batch = section.fields.slice(i, i + BATCH_SIZE);
            
            // Process each field in the batch
            for (const field of batch) {
              try {
                // Safely handle conditionalLogic
                let conditionalLogicValue = null;
                if (field.conditionalLogic) {
                  try {
                    if (typeof field.conditionalLogic === 'string') {
                      conditionalLogicValue = JSON.parse(field.conditionalLogic);
                    } else {
                      conditionalLogicValue = field.conditionalLogic;
                    }
                  } catch (parseError) {
                    console.error(`[DUPLICATE-ASYNC] Error parsing conditionalLogic:`, parseError);
                    conditionalLogicValue = null;
                  }
                }
                
                // Safely handle options
                let optionsValue = null;
                if (field.options) {
                  try {
                    if (typeof field.options === 'string') {
                      optionsValue = JSON.parse(field.options);
                    } else {
                      optionsValue = field.options;
                    }
                  } catch (parseError) {
                    console.error(`[DUPLICATE-ASYNC] Error parsing options:`, parseError);
                    optionsValue = [];
                  }
                }
                
                // Safely handle validation
                let validationValue = null;
                if (field.validation) {
                  try {
                    if (typeof field.validation === 'string') {
                      validationValue = JSON.parse(field.validation);
                    } else {
                      validationValue = field.validation;
                    }
                  } catch (parseError) {
                    console.error(`[DUPLICATE-ASYNC] Error parsing validation:`, parseError);
                    validationValue = null;
                  }
                }

                await prisma.formField.create({
                  data: {
                    sectionId: newSection.id,
                    type: field.type,
                    label: field.label,
                    placeholder: field.placeholder || '',
                    helpText: field.helpText || '',
                    required: field.required,
                    options: optionsValue,
                    validation: validationValue,
                    order: field.order,
                    excludeTime: field.excludeTime || false,
                    mapping: field.mapping || null,
                    conditionalLogic: conditionalLogicValue,
                  },
                });
              } catch (fieldError) {
                console.error(`[DUPLICATE-ASYNC] Error creating field:`, fieldError);
                
                // Try again with minimal data
                try {
                  await prisma.formField.create({
                    data: {
                      sectionId: newSection.id,
                      type: field.type || 'text',
                      label: field.label || 'Untitled Field',
                      placeholder: field.placeholder || '',
                      helpText: field.helpText || '',
                      required: !!field.required,
                      options: null,
                      validation: null,
                      order: field.order || 0,
                      excludeTime: false,
                      mapping: null,
                      conditionalLogic: null,
                    },
                  });
                  
                  if (process.env.NODE_ENV !== 'production') {
                    console.log(`[DUPLICATE-ASYNC] Successfully created field with minimal data`);
                  }
                } catch (fallbackError) {
                  console.error(`[DUPLICATE-ASYNC] Failed to create field even with minimal data:`, fallbackError);
                  // Continue with other fields
                }
              }
            }
          }
        }
        
        completedSections++;
        const progress = Math.floor((completedSections / totalSections) * 100);
        
        // Update progress in the database
        await prisma.backgroundJob.update({
          where: { id: jobId },
          data: { 
            metadata: JSON.stringify({
              progress: progress,
              newFormId: newFormId
            })
          }
        });
      } catch (sectionError) {
        console.error(`[DUPLICATE-ASYNC] Error processing section:`, sectionError);
        
        // Try to create a minimal section to continue the process
        try {
          const fallbackSection = await prisma.formSection.create({
            data: {
              formId: newFormId,
              title: section.title || 'Untitled Section',
              description: '',
              order: section.order || completedSections,
              isPage: false,
            },
          });
          
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[DUPLICATE-ASYNC] Created fallback section`);
          }
          
          // Add at least one basic field to the section
          if (section.fields && section.fields.length > 0) {
            try {
              const firstField = section.fields[0];
              await prisma.formField.create({
                data: {
                  sectionId: fallbackSection.id,
                  type: firstField.type || 'text',
                  label: firstField.label || 'Untitled Field',
                  placeholder: '',
                  helpText: '',
                  required: false,
                  options: null,
                  validation: null,
                  order: 0,
                  excludeTime: false,
                  mapping: null,
                  conditionalLogic: null,
                },
              });
              
              if (process.env.NODE_ENV !== 'production') {
                console.log(`[DUPLICATE-ASYNC] Added basic field to fallback section`);
              }
            } catch (fieldError) {
              console.error(`[DUPLICATE-ASYNC] Failed to add field to fallback section:`, fieldError);
            }
          }
          
          completedSections++;
        } catch (fallbackError) {
          console.error(`[DUPLICATE-ASYNC] Failed to create fallback section:`, fallbackError);
        }
      }
    }

    // Update job status to completed
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { 
        status: 'completed',
        metadata: JSON.stringify({
          progress: 100,
          newFormId: newFormId
        }),
        completedAt: new Date()
      }
    });
  } catch (error) {
    // Update job status to failed
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { 
        status: 'failed',
        error: (error as Error).message,
        completedAt: new Date()
      }
    });
  }
}