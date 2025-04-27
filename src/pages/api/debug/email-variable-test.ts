import { NextApiRequest, NextApiResponse } from 'next';
import { sendEmail } from '@/util/email-sender';
import { replaceVariables } from '@/util/email-template-helpers';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Extract parameters from the request
    const { 
      email, 
      subject = 'Test Subject with {{name}}',
      body = '<p>Hello {{name}},</p><p>This is a test email with your {{message}}.</p>',
      userId = 'test-user-id'
    } = req.query;
    
    // Get all other parameters as data for variable replacement
    const { email: _, subject: __, body: ___, userId: ____, ...variableData } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('================ EMAIL VARIABLE TEST ================');
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Email:', email);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Subject Template:', subject);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Body Template:', body);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Variable Data:', JSON.stringify(variableData, null, 2));
    }
    
    // Create a test submission for proper variable replacement structure
    const testSubmission = {
      id: `test-submission-${Date.now()}`,
      data: { ...variableData },
      timeStamp: new Date().toISOString(),
      trackingToken: `test-tracking-token-${Date.now()}`,
      leadId: 'test-lead-id'
    };
    
    // Create a replacement data object with proper structure like in process-async.ts
    const replacementData = { 
      ...variableData,
      submission: testSubmission,
      formSubmission: testSubmission,
      formData: variableData
    };
    
    // IMPORTANT: Flatten submission data to top level for direct access
    // This helps templates that use {{fieldName}} instead of {{formData.fieldName}}
    if (testSubmission.data && typeof testSubmission.data === 'object') {
      Object.entries(testSubmission.data).forEach(([key, value]) => {
        replacementData[key] = value;
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Flattened submission data keys: ${Object.keys(testSubmission.data).join(', ')}`);
      }
    }
    
    // Process subject and body with variable replacement
    if (process.env.NODE_ENV !== 'production') {
      console.log('Performing variable replacement...');
    }
    
    // Find all variables in templates 
    const subjectVariables = String(subject).match(/\{\{([^}]+)\}\}/g) || [];
    const bodyVariables = String(body).match(/\{\{([^}]+)\}\}/g) || [];
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
        
        // Check in different locations
        if (replacementData[varName] !== undefined) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`  ✓ ${varName}: FOUND directly in replacementData`);
          }
        } else if (replacementData.formData[varName] !== undefined) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`  ✓ ${varName}: FOUND in formData`);
          }
        } else if (replacementData.submission?.data?.[varName] !== undefined) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`  ✓ ${varName}: FOUND in submission.data`);
          }
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`  ✗ ${varName}: NOT FOUND in any location`);
          }
        }
      }
    }
    
    // Replace variables in subject and body
    const processedSubject = replaceVariables(String(subject), replacementData);
    const processedBody = replaceVariables(String(body), replacementData);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Processed Subject:', processedSubject);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Processed Body:', processedBody);
    }
    
    // Now send the email
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sending email...');
    }
    const result = await sendEmail({
      to: String(email),
      subject: processedSubject,
      html: processedBody,
      userId: String(userId)
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Email Send Result:', JSON.stringify(result, null, 2));
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('====================================================');
    }
    
    return res.status(200).json({
      success: result.success,
      emailLogId: result.emailLogId,
      error: result.error,
      originalData: {
        email,
        subject,
        body,
        variableData
      },
      processed: {
        subject: processedSubject,
        body: processedBody
      }
    });
  } catch (error) {
    console.error('Error in email variable test:', error);
    return res.status(500).json({ error: 'Error sending test email with variables' });
  }
} 