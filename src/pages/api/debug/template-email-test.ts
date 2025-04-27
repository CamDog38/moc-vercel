import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { replaceVariables } from '@/util/email-template-helpers';
import { sendEmail } from '@/util/email-sender';

// Define a type for our variable data
type VariableData = {
  [key: string]: string | string[] | undefined;
};

// Define complete data structure for type safety
interface CompleteData {
  [key: string]: any; // Allow index access with string key
  formData: VariableData;
  submission: {
    id: string;
    data: VariableData;
    timeStamp: string;
    trackingToken: string;
    leadId: string;
  };
  formSubmission: {
    id: string;
    data: VariableData;
    timeStamp: string;
    trackingToken: string;
    leadId: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Extract parameters
    const { 
      email, 
      templateId = 'test-template-id', // Default to test template
      userId = '2bcdff61-39e6-4db4-9742-e7144b7f6429', // Default user ID 
    } = req.query;
    
    // Get variable data from remaining query params
    const { email: _, templateId: __, userId: ___, ...variableData } = req.query as VariableData;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('=============== TEMPLATE EMAIL TEST ===============');
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Parameters:', { email, templateId, userId });
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Variable Data:', JSON.stringify(variableData, null, 2));
    }

    // Find the template
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId as string },
    });

    if (!template) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Template with ID ${templateId} not found`);
      }
      return res.status(404).json({ error: `Template with ID ${templateId} not found` });
    }

    console.log('Found template:', { 
      id: template.id, 
      name: template.name, 
      subject: template.subject,
      htmlContentPreview: template.htmlContent?.substring(0, 100) + '...' 
    });

    // Create a test submission
    const testSubmission = {
      id: 'test-submission-' + Date.now(),
      data: { ...variableData },
      timeStamp: Date.now().toString(),
      trackingToken: 'test-tracking-token-' + Date.now(),
      leadId: 'test-lead-id',
    };

    // Create the complete data object for variable replacement
    // This mimics how the real system would prepare data
    const completeData: CompleteData = {
      ...variableData,          // Direct access to query params
      formData: variableData,   // Access via formData.fieldName
      submission: testSubmission, // Access via submission.data.fieldName
      formSubmission: testSubmission, // Alternative access
    };

    // Add flattened submission data to the top level
    // This is a crucial step that might be missing in the real system
    Object.entries(testSubmission.data).forEach(([key, value]) => {
      completeData[key] = value;
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('Complete Data Structure:', JSON.stringify(completeData, null, 2));
    }

    // Find variables in template
    const subjectVariables = template.subject.match(/\{\{([^}]+)\}\}/g) || [];
    const bodyVariables = template.htmlContent?.match(/\{\{([^}]+)\}\}/g) || [];
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Subject Variables:', subjectVariables);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Body Variables:', bodyVariables);
    }

    // Check for each variable if it exists in our data
    const allVariables = [...new Set([...subjectVariables, ...bodyVariables])];
    
    if (allVariables.length > 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Variable availability check:');
      }
      for (const variable of allVariables) {
        const varName = variable.replace(/^\{\{|\}\}$/g, '').trim();
        
        // Check direct access
        if (completeData[varName] !== undefined) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`  ✓ ${varName}: FOUND directly in completeData`);
          }
          continue;
        }
        
        // Check in formData
        if (completeData.formData?.[varName] !== undefined) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`  ✓ ${varName}: FOUND in formData`);
          }
          continue;
        }
        
        // Check in submission.data
        if (completeData.submission?.data?.[varName] !== undefined) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`  ✓ ${varName}: FOUND in submission.data`);
          }
          continue;
        }
        
        // Check if it's a special variable
        if (['timeStamp', 'trackingToken', 'leadId', 'bookingLink'].includes(varName)) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`  ✓ ${varName}: is a SPECIAL VARIABLE`);
          }
          continue;
        }
        
        // Variable not found
        if (process.env.NODE_ENV !== 'production') {
          console.log(`  ✗ ${varName}: NOT FOUND in any location`);
        }
      }
    }

    // Perform variable replacement
    if (process.env.NODE_ENV !== 'production') {
      console.log('Replacing variables in subject and body...');
    }
    const processedSubject = replaceVariables(template.subject, completeData);
    const processedBody = replaceVariables(template.htmlContent || '', completeData);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Original subject:', template.subject);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Processed subject:', processedSubject);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Original body preview:', template.htmlContent?.substring(0, 100) + '...');
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Processed body preview:', processedBody.substring(0, 100) + '...');
    }
    
    // Check if any variables were not replaced (still have {{variable}} format)
    const remainingSubjectVars = processedSubject.match(/\{\{([^}]+)\}\}/g) || [];
    const remainingBodyVars = processedBody.match(/\{\{([^}]+)\}\}/g) || [];
    
    if (remainingSubjectVars.length > 0 || remainingBodyVars.length > 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('WARNING: Some variables were not replaced:');
      }
      if (remainingSubjectVars.length > 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('  Subject:', remainingSubjectVars);
        }
      }
      if (remainingBodyVars.length > 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('  Body:', remainingBodyVars);
        }
      }
    }

    // Send the email
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sending email...');
    }
    const result = await sendEmail({
      to: String(email),
      subject: processedSubject,
      html: processedBody,
      userId: String(userId),
      templateId: template.id,
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Send Email Result:', JSON.stringify(result, null, 2));
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('====================================================');
    }

    // Return the results
    return res.status(200).json({
      success: result.success,
      emailLogId: result.emailLogId,
      error: result.error,
      templateDetails: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        bodyPreview: template.htmlContent?.substring(0, 100) + '...'
      },
      variables: {
        found: allVariables.length - (remainingSubjectVars.length + remainingBodyVars.length),
        total: allVariables.length,
        notReplaced: [...remainingSubjectVars, ...remainingBodyVars]
      },
      processed: {
        subject: processedSubject,
        bodyPreview: processedBody.substring(0, 100) + '...'
      }
    });
  } catch (error: unknown) {
    console.error('Error in template email test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: `Error processing template email: ${errorMessage}` });
  }
} 