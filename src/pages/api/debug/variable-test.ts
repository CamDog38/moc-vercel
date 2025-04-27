import { NextApiRequest, NextApiResponse } from 'next';
import { replaceVariables } from '@/util/email-template-helpers';
import { FormSubmission } from '@prisma/client';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Extract variables from the request
    const { template = '{{name}} - {{email}} - {{message}}', data } = req.query;
    
    // Parse data if it's a string, or use query params as data
    let testData: Record<string, any> = {};
    if (typeof data === 'string') {
      try {
        testData = JSON.parse(data);
      } catch (error) {
        console.error('Failed to parse data JSON:', error);
      }
    } else {
      // Use all query params except 'template' and 'data'
      const { template: _, data: __, ...params } = req.query;
      testData = params;
    }
    
    // Create a fake submission for testing
    const fakeSubmission: Partial<FormSubmission> = {
      id: 'test-submission-id',
      data: { ...testData },
      timeStamp: Date.now().toString(),
      trackingToken: 'test-tracking-token',
      leadId: 'test-lead-id'
    };
    
    // Log what we're testing
    if (process.env.NODE_ENV !== 'production') {
      console.log('============ VARIABLE REPLACEMENT TEST ============');
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Template:', template);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Test Data:', JSON.stringify(testData, null, 2));
    }
    
    // Create the normalized data structure that should be used
    const testCompleteData = {
      ...testData,
      formData: testData,
      submission: fakeSubmission,
      formSubmission: fakeSubmission
    };
    
    // Also directly add the submission data fields to the top level
    Object.entries(fakeSubmission.data || {}).forEach(([key, value]) => {
      testCompleteData[key] = value;
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Complete Data Structure:', JSON.stringify(testCompleteData, null, 2));
    }

    // Find all variables in the template
    const variables = (typeof template === 'string' ? template : '').match(/\{\{([^}]+)\}\}/g) || [];
    if (process.env.NODE_ENV !== 'production') {
      console.log('Variables in template:', variables);
    }
    
    // For each variable, check if it would be found
    if (variables.length > 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Variable Resolution Check:');
      }
      for (const variable of variables) {
        const varName = variable.replace(/^\{\{|\}\}$/g, '').trim();
        if (process.env.NODE_ENV !== 'production') {
          console.log(`  ${varName}:`);
        }
        
        // Check direct access
        if (testCompleteData[varName] !== undefined) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`    ✓ FOUND directly in testCompleteData as: ${testCompleteData[varName]}`);
          }
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`    ✗ NOT FOUND directly in testCompleteData`);
          }
        }
        
        // Check in formData
        if (testCompleteData.formData && testCompleteData.formData[varName] !== undefined) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`    ✓ FOUND in formData as: ${testCompleteData.formData[varName]}`);
          }
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`    ✗ NOT FOUND in formData`);
          }
        }
        
        // Check in submission.data
        if (testCompleteData.submission?.data && testCompleteData.submission.data[varName] !== undefined) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`    ✓ FOUND in submission.data as: ${testCompleteData.submission.data[varName]}`);
          }
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`    ✗ NOT FOUND in submission.data`);
          }
        }
        
        // Check if it's a special variable
        if (['timeStamp', 'trackingToken', 'leadId', 'bookingLink'].includes(varName)) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`    ✓ SPECIAL VARIABLE: ${varName}`);
          }
        }
        
        // Check if it uses dot notation
        if (varName.includes('.')) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`    ℹ️ USES DOT NOTATION (will try to access nested property)`);
          }
          const parts = varName.split('.');
          let value = testCompleteData;
          let found = true;
          
          for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
              value = value[part];
            } else {
              found = false;
              if (process.env.NODE_ENV !== 'production') {
                console.log(`    ✗ NESTED PATH BROKEN at '${part}'`);
              }
              break;
            }
          }
          
          if (found) {
            if (process.env.NODE_ENV !== 'production') {
              console.log(`    ✓ NESTED VALUE FOUND: ${value}`);
            }
          }
        }
      }
    }
    
    // Perform the actual variable replacement
    const result = replaceVariables(template as string, testCompleteData);
    if (process.env.NODE_ENV !== 'production') {
      console.log('Result after variable replacement:', result);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('=================================================');
    }
    
    // Return the results
    return res.status(200).json({
      template,
      data: testData,
      dataStructure: testCompleteData,
      variables,
      result
    });
  } catch (error) {
    console.error('Error in variable test:', error);
    return res.status(500).json({ error: 'Error processing variable test' });
  }
} 