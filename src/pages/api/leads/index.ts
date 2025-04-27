import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { createClient } from '@/util/supabase/api';
import { addApiLog } from '../debug/logs';
import { bulkLeadSubmissionService } from '@/lib/forms2/services/bulk/bulkLeadSubmissionService';
import { processEmailRulesDirect } from '@/lib/forms2/services/email-processing/directEmailProcessor';
import { initializeDirectEmailService } from '@/lib/forms2/services/email-processing/directEmailService';

interface FormField {
  id: string;
  type: string;
  name: string;
  label?: string;
  mapping?: string;
}

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  form?: {
    id: string;
    name: string;
    fields: any[];
  } | null;
  submissions: Array<{
    id: string;
    data: any;
  }>;
  createdAt: Date;
  leadId?: string;
}

interface TransformedLead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  form: {
    id: string | undefined;
    name: string;
  };
  createdAt: Date;
  mappedData: Record<string, any>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set cache control headers to prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getLeads(req, res);
    case 'POST':
      return createLead(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getLeads(req: NextApiRequest, res: NextApiResponse) {
  // Create a timeout promise to prevent hanging requests
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Database query timeout'));
    }, 10000); // 10 second timeout
  });

  try {
    addApiLog('Starting leads fetch', 'info', 'leads');
    
    // Get the authenticated user
    const supabase = createClient(req, res);
    const authPromise = supabase.auth.getUser();
    const authResult = await Promise.race([authPromise, timeoutPromise]) as any;
    const { data: { user }, error: authError } = authResult;

    if (authError || !user) {
      addApiLog('Auth error or no user', 'error', 'leads');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    addApiLog('Authenticated user', 'success', 'leads');

    // Create the database query promise with a limit to prevent large result sets
    const queryPromise = prisma.lead.findMany({
      // Temporarily remove user filtering to see all leads
      // where: {
      //   assignedUserId: user.id
      // },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to 100 records to prevent timeouts
      include: {
        form: {
          select: {
            id: true,
            name: true,
            fields: true,
          },
        },
        submissions: {
          select: {
            id: true,
            data: true,
          },
          take: 1, // Only get the most recent submission
        },
      },
    });

    // Race the database query against the timeout
    const leads = await Promise.race([queryPromise, timeoutPromise]) as Lead[];

    addApiLog(`Retrieved ${leads.length} leads`, 'success', 'leads');

    // Transform the leads data to include mapped field names
    // Process leads in smaller batches to avoid timeouts with large datasets
    const BATCH_SIZE = 10;
    let transformedLeads: TransformedLead[] = [];
    
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      addApiLog(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(leads.length / BATCH_SIZE)}`, 'info', 'leads');
      
      const batchResults = batch.map((lead: Lead) => {
        try {
          const submission = lead.submissions[0]?.data as Record<string, any> || {};
          // Ensure lead.form?.fields is an array before calling map
          const formFields = Array.isArray(lead.form?.fields) ? lead.form.fields : [];
          const fields: FormField[] = formFields.map(field => ({
            id: field.id || '',
            type: field.type || '',
            name: field.name || '',
            label: field.label || '',
            mapping: field.mapping || ''
          }));

          // Simplified field extraction
          const getName = () => {
            try {
              // First check for direct name field
              if (lead.name) return lead.name;

              // Look for fields with 'name' in the label
              const nameField = fields.find(f => 
                (f.label || '').toLowerCase().includes('name') ||
                (f.name || '').toLowerCase().includes('name')
              );

              if (nameField && submission[nameField.id]) {
                return String(submission[nameField.id]);
              }

              return null;
            } catch (error) {
              addApiLog(`Error in getName for lead ${lead.id}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'leads');
              return lead.name || null;
            }
          };

          const getEmail = () => {
            try {
              // First check for direct email
              if (lead.email) return lead.email;

              // Look for fields with 'email' in the label
              const emailField = fields.find(f => 
                (f.label || '').toLowerCase().includes('email') ||
                (f.name || '').toLowerCase().includes('email')
              );

              return emailField && submission[emailField.id] 
                ? String(submission[emailField.id])
                : null;
            } catch (error) {
              addApiLog(`Error in getEmail for lead ${lead.id}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'leads');
              return lead.email || null;
            }
          };

          const getPhone = () => {
            try {
              // First check for direct phone
              if (lead.phone) return lead.phone;

              // Look for fields with 'phone' or 'mobile' in the label
              // but exclude DOB fields to prevent incorrect mapping
              const phoneField = fields.find(f => {
                const labelLower = (f.label || '').toLowerCase();
                const nameLower = (f.name || '').toLowerCase();
                const typeLower = (f.type || '').toLowerCase();
                
                // Check if it's a phone field
                const isPhoneField = 
                  labelLower.includes('phone') ||
                  labelLower.includes('mobile') ||
                  nameLower.includes('phone') ||
                  nameLower.includes('mobile');
                
                // Make sure it's not a DOB field
                const isDOBField = 
                  typeLower === 'dob' ||
                  labelLower.includes('birth') ||
                  labelLower.includes('dob') ||
                  nameLower.includes('birth') ||
                  nameLower.includes('dob');
                
                return isPhoneField && !isDOBField;
              });

              return phoneField && submission[phoneField.id]
                ? String(submission[phoneField.id])
                : null;
            } catch (error) {
              addApiLog(`Error in getPhone for lead ${lead.id}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'leads');
              return lead.phone || null;
            }
          };

          // Simplified mapped data extraction
          const mappedData: Record<string, any> = {};
          try {
            // Only include essential fields to reduce payload size
            for (const field of fields) {
              const value = submission[field.id];
              if (value !== undefined && value !== null) {
                const fieldName = field.label || field.name;
                const isEssentialField = 
                  fieldName.toLowerCase().includes('name') || 
                  fieldName.toLowerCase().includes('email') || 
                  fieldName.toLowerCase().includes('phone') || 
                  fieldName.toLowerCase().includes('mobile');
                  
                if (isEssentialField) {
                  // Use bracket notation to safely add to the record
                  mappedData[fieldName] = value;
                }
              }
            }
          } catch (error) {
            addApiLog(`Error mapping data for lead ${lead.id}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'leads');
          }

          const result = {
            id: lead.id,
            name: getName(),
            email: getEmail(),
            phone: getPhone(),
            form: {
              id: lead.form?.id,
              name: lead.form?.name || 'Unknown Form'
            },
            createdAt: lead.createdAt,
            mappedData
          };

          return result;
        } catch (error) {
          addApiLog(`Error processing lead ${lead.id}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'leads');
          // Return a safe fallback object for this lead
          return {
            id: lead.id,
            name: lead.name || null,
            email: lead.email || null,
            phone: lead.phone || null,
            form: {
              id: lead.form?.id,
              name: lead.form?.name || 'Unknown Form'
            },
            createdAt: lead.createdAt,
            mappedData: {}
          };
        }
      });
      
      // Filter out any null or undefined results before merging
      transformedLeads = [...transformedLeads, ...batchResults.filter(Boolean)];
      
      // Add a small delay between batches to prevent CPU overload
      if (i + BATCH_SIZE < leads.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    addApiLog(`Final transformed leads count: ${transformedLeads.length}`, 'success', 'leads');
    return res.status(200).json(transformedLeads);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error fetching leads: ${errorMessage}`, 'error', 'leads');
    
    if (errorMessage === 'Database query timeout') {
      return res.status(504).json({ 
        error: 'Request timed out while fetching leads',
        message: 'The server took too long to respond. Please try again later.'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to fetch leads',
      message: errorMessage
    });
  }
}

const createLead = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  // Create a timeout promise to prevent hanging requests
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Database operation timeout'));
    }, 8000); // 8 second timeout
  });

  try {
    const { formId, name, email, phone, mappedData } = req.body;

    // Log the incoming request data
    addApiLog(`Received lead submission request for form ${formId}`, 'info', 'leads');
    console.log(`[LEAD API] Received submission request for form ${formId}`);
    console.log(`[LEAD API] Submission data:`, {
      formId,
      hasName: !!name,
      hasEmail: !!email,
      hasPhone: !!phone,
      mappedDataKeys: mappedData ? Object.keys(mappedData) : [],
      hasFirstName: mappedData?.firstName ? true : false,
      hasLastName: mappedData?.lastName ? true : false
    });

    // Basic validation
    if (!formId) {
      addApiLog('Missing form ID', 'error', 'leads');
      console.log(`[LEAD API] Error: Missing form ID`);
      return res.status(400).json({ error: 'Form ID is required' });
    }

    // Use the lead submission service to process the submission with proper name handling
    // This handles creating both the lead and the form submission
    const formData = {
      ...mappedData,
      name,
      email,
      phone
    };

    // Get the source URL from the request headers
    const sourceUrl = req.headers.referer || 'api_submission';
    console.log(`[LEAD API] Source URL: ${sourceUrl}`);
    
    addApiLog(`Processing submission with bulk lead submission service`, 'info', 'leads');
    console.log(`[LEAD API] Using bulkLeadSubmissionService to process submission`);
    const result = await Promise.race([
      bulkLeadSubmissionService.processSubmission(formId, formData, sourceUrl),
      timeoutPromise
    ]);
    
    console.log(`[LEAD API] Lead submission service result: success=${result.success}, leadId=${result.leadId || 'N/A'}, submissionId=${result.submissionId || 'N/A'}${result.error ? ', error=' + result.error : ''}`);

    // If the submission was not successful, return an error
    if (!result.success) {
      addApiLog(`Lead submission failed: ${result.error || result.message}`, 'error', 'leads');
      console.log(`[LEAD API] Lead submission failed: ${result.error || result.message}`);
      return res.status(400).json({ error: result.error || result.message });
    }

    addApiLog(`Lead created with ID: ${result.leadId}, submission ID: ${result.submissionId}`, 'success', 'leads');
    console.log(`[LEAD API] Lead created successfully with ID: ${result.leadId}, submission ID: ${result.submissionId}`);
    
    // If we have a submission ID and mapped data, process email rules
    if (result.submissionId && mappedData) {
      addApiLog(`Processing email rules for submission ID: ${result.submissionId}`, 'info', 'leads');
      console.log(`[LEAD API] Starting email processing for submission ID: ${result.submissionId}`);
      
      // Pre-connect to SMTP server to speed up email sending
      // This happens in parallel with fetching the submission
      console.log(`[LEAD API] Pre-connecting to SMTP server...`);
      initializeDirectEmailService().catch(error => {
        console.error(`[LEAD API] SMTP pre-connection error:`, error);
      });
      
      // Get the submission
      const submission = await prisma.formSubmission.findUnique({
        where: { id: result.submissionId }
      });
      
      if (submission) {
        addApiLog(`Found submission with ID: ${submission.id}`, 'success', 'leads');
        console.log(`[LEAD API] Found submission with ID: ${submission.id} for email processing`);
        
        // Process email rules for this submission directly without using setTimeout or internal API calls
        // This is more reliable in serverless environments like Vercel
        try {
          addApiLog(`Processing email rules directly for submission: ${submission.id}`, 'info', 'leads');
          console.log(`[LEAD API] Processing email rules directly for submission: ${submission.id}`);
          
          // Process email rules in the background without awaiting the result
          // This prevents timeouts when creating leads
          const submissionId = submission.id; // Capture in local variable for closure
          Promise.resolve().then(async () => {
            try {
              addApiLog(`Executing direct email processing for submission: ${submissionId}`, 'info', 'leads');
              console.log(`[LEAD API] [EMAIL] Executing direct email processing for submission: ${submissionId}`);
              
              // Process email rules directly without making an internal API call
              const emailResult = await processEmailRulesDirect(
                formId,
                mappedData,
                submissionId
              );
              
              if (emailResult.success) {
                const matchingRulesCount = emailResult.matchingRules?.length || 0;
                addApiLog(`Email processing completed successfully: ${emailResult.message}`, 'success', 'leads');
                console.log(`[LEAD API] [EMAIL] Email processing completed successfully: ${emailResult.message}`);
                
                if (matchingRulesCount > 0) {
                  console.log(`[LEAD API] [EMAIL] Processed ${matchingRulesCount} matching rules`);
                } else {
                  console.log(`[LEAD API] [EMAIL] No matching rules found for this submission`);
                }
              } else {
                addApiLog(`Email processing failed: ${emailResult.error || 'Unknown error'}`, 'error', 'leads');
                console.log(`[LEAD API] [EMAIL] Email processing failed: ${emailResult.error || 'Unknown error'}`);
              }
            } catch (emailError) {
              addApiLog(`Error in direct email processing: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`, 'error', 'leads');
              console.log(`[LEAD API] [EMAIL] Error in direct email processing: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
            }
          });
          
          console.log(`[LEAD API] Email processing started in background`);
        } catch (emailError) {
          addApiLog(`Error processing email rules: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`, 'error', 'leads');
          console.log(`[LEAD API] Error processing email rules: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
        }
      } else {
        addApiLog(`Submission not found: ${result.submissionId}`, 'error', 'leads');
        console.log(`[LEAD API] Error: Submission not found with ID: ${result.submissionId}`);
      }
    }
    
    // Fetch the updated lead with the new submission, with timeout protection
    console.log(`[LEAD API] Fetching updated lead with submission data`);
    const fetchUpdatedLeadPromise = prisma.lead.findUnique({
      where: { id: result.leadId },
      include: {
        form: true,
        submissions: true
      }
    });
    
    const updatedLead = await Promise.race([fetchUpdatedLeadPromise, timeoutPromise]) as any;
    
    addApiLog(`Successfully created lead with submission: ${result.leadId}`, 'success', 'leads');
    console.log(`[LEAD API] Successfully created lead with submission: ${result.leadId}`);
    console.log(`[LEAD API] Returning lead data with ${updatedLead?.submissions?.length || 0} submissions`);
    return res.status(201).json({
      ...updatedLead,
      submissionId: result.submissionId
    });
  } catch (error) {
    // Check if it's a timeout error
    if (error instanceof Error && error.message === 'Database operation timeout') {
      addApiLog('Lead creation timed out', 'error', 'leads');
      console.log(`[LEAD API] Error: Lead creation timed out`);
      return res.status(504).json({ 
        error: 'Request timed out while creating lead',
        message: 'The server took too long to respond. Please try again later.'
      });
    }
    
    addApiLog(`Error creating lead: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'leads');
    console.log(`[LEAD API] Error creating lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({ error: 'Failed to create lead: ' + (error instanceof Error ? error.message : 'Unknown error') });
  }
}