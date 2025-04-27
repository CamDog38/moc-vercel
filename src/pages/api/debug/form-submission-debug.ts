import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { replaceVariables } from '@/util/email-template-helpers';

type FormData = {
  [key: string]: any;
};

// Define a simplified version of our database types for this debug endpoint
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
}

interface EmailRule {
  id: string;
  name: string;
  conditions: string | null;
  templateId: string;
  template?: EmailTemplate;
}

interface Form {
  id: string;
  name: string;
  userId: string;
  emailRules: EmailRule[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get form ID and form data from the request
    const { formId, ...formData } = req.query;
    
    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('==== FORM SUBMISSION DEBUG ====');
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Form ID:', formId);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Form Data:', formData);
    }

    // Find the form
    const form = await prisma.form.findUnique({
      where: { id: formId as string },
      include: {
        emailRules: {
          include: {
            template: true // This is the proper relation name in schema
          }
        }
      }
    }) as unknown as Form; // Cast to our simplified type

    if (!form) {
      return res.status(404).json({ error: `Form with ID ${formId} not found` });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Found form:', form.name);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Email rules count:', form.emailRules.length);
    }
    
    // Prepare a copy of formData for variable inspection
    const submissionData: FormData = { ...formData };
    
    // Create an object to store the debug information
    const debugInfo = {
      form: {
        id: form.id,
        name: form.name,
        userId: form.userId
      },
      emailRules: [] as any[],
      variableReport: [] as any[]
    };

    // For each email rule, check if it would be triggered
    for (const rule of form.emailRules) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\nProcessing Email Rule: ${rule.name}`);
      }
      
      const ruleDebug = {
        id: rule.id,
        name: rule.name,
        templateId: rule.templateId,
        templateName: rule.template?.name || 'Unknown',
        conditions: [] as any[],
        conditionEvaluation: [] as any[],
        allConditionsMet: false,
        variableReplacements: [] as any[]
      };
      
      debugInfo.emailRules.push(ruleDebug);
      
      // Parse the conditions
      let conditions: any[] = [];
      try {
        conditions = rule.conditions ? JSON.parse(rule.conditions) : [];
        ruleDebug.conditions = conditions;
        if (process.env.NODE_ENV !== 'production') {
          console.log('Conditions:', conditions);
        }
      } catch (err) {
        console.error('Error parsing conditions:', err);
        ruleDebug.conditions = [{ error: 'Failed to parse conditions' }];
        continue;
      }
      
      // Check if all conditions are met
      let allConditionsMet = true;
      
      if (conditions.length > 0) {
        for (const condition of conditions) {
          const { field, operator, value } = condition;
          const formValue = submissionData[field];
          let conditionMet = false;
          
          const conditionResult = {
            field,
            operator,
            expectedValue: value,
            actualValue: formValue,
            result: false,
            reason: ''
          };
          
          // Evaluate the condition
          switch (operator) {
            case 'equals':
              conditionMet = formValue === value;
              conditionResult.reason = conditionMet ? 'Values match' : 'Values do not match';
              break;
            case 'notEquals':
              conditionMet = formValue !== value;
              conditionResult.reason = conditionMet ? 'Values do not match' : 'Values match';
              break;
            case 'contains':
              conditionMet = formValue && formValue.includes(value);
              conditionResult.reason = conditionMet ? 'Value contains expected string' : 'Value does not contain expected string';
              break;
            case 'notContains':
              conditionMet = !formValue || !formValue.includes(value);
              conditionResult.reason = conditionMet ? 'Value does not contain string' : 'Value contains string';
              break;
            case 'exists':
              conditionMet = formValue !== undefined && formValue !== null && formValue !== '';
              conditionResult.reason = conditionMet ? 'Field exists and has value' : 'Field is missing or empty';
              break;
            case 'notExists':
              conditionMet = formValue === undefined || formValue === null || formValue === '';
              conditionResult.reason = conditionMet ? 'Field is missing or empty' : 'Field exists and has value';
              break;
            default:
              conditionResult.reason = `Unknown operator: ${operator}`;
              conditionMet = false;
          }
          
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Condition: ${field} ${operator} ${value} => ${conditionMet} (${formValue})`);
          }
          conditionResult.result = conditionMet;
          ruleDebug.conditionEvaluation.push(conditionResult);
          
          if (!conditionMet) {
            allConditionsMet = false;
          }
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log('No conditions defined, treating as match');
        }
      }
      
      ruleDebug.allConditionsMet = allConditionsMet;
      if (process.env.NODE_ENV !== 'production') {
        console.log('All conditions met:', allConditionsMet);
      }
      
      // If all conditions are met, process the variables for the template
      if (allConditionsMet && rule.template) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('\nProcessing variables for template:', rule.template.name);
        }
        
        // Create submission object similar to actual processing
        const submission = {
          id: `debug-submission-${Date.now()}`,
          data: submissionData,
          timeStamp: new Date().toISOString(),
          trackingToken: `debug-token-${Date.now()}`,
          leadId: `debug-lead-${Date.now()}`
        };
        
        // Create the data object for variable replacement
        const dataForReplacement: Record<string, any> = {
          ...submissionData,
          formData: submissionData,
          submission,
          formSubmission: submission,
        };
        
        // Find all variables in the template
        const template = rule.template;
        const subjectVars = template.subject?.match(/\{\{([^}]+)\}\}/g) || [];
        const bodyVars = template.htmlContent?.match(/\{\{([^}]+)\}\}/g) || [];
        const allVars = [...new Set([...subjectVars, ...bodyVars])];
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('Variables found in template:', allVars);
        }
        
        // Check each variable
        for (const variable of allVars) {
          const varName = variable.replace(/^\{\{|\}\}$/g, '').trim();
          
          const varDebug: {
            variable: string; 
            locations: string[];
            value: any; 
            found: boolean;
            replacement: string;
          } = {
            variable: varName,
            locations: [],
            value: null,
            found: false,
            replacement: ''
          };
          
          // Check all possible locations
          if (dataForReplacement[varName] !== undefined) {
            varDebug.locations.push('direct');
            varDebug.found = true;
            varDebug.value = dataForReplacement[varName];
          }
          
          if (dataForReplacement.formData?.[varName] !== undefined) {
            varDebug.locations.push('formData');
            varDebug.found = true;
            varDebug.value = dataForReplacement.formData[varName];
          }
          
          if (dataForReplacement.submission?.data?.[varName] !== undefined) {
            varDebug.locations.push('submission.data');
            varDebug.found = true;
            varDebug.value = dataForReplacement.submission.data[varName];
          }
          
          // Special variables
          if (['timeStamp', 'trackingToken', 'leadId', 'bookingLink'].includes(varName)) {
            varDebug.locations.push('special');
            varDebug.found = true;
            
            if (varName === 'timeStamp') {
              varDebug.value = submission.timeStamp;
            } else if (varName === 'trackingToken') {
              varDebug.value = submission.trackingToken;
            } else if (varName === 'leadId') {
              varDebug.value = submission.leadId;
            } else if (varName === 'bookingLink') {
              varDebug.value = 'https://example.com/booking';
            }
          }
          
          // Log variable status
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Variable ${varName}: ${varDebug.found ? 'Found' : 'Not found'} in ${varDebug.locations.join(', ') || 'nowhere'}`);
          }
          
          // Calculate what the replaced value would be
          if (varDebug.found) {
            // Create a test string to check replacement
            const testStr = `Test {{${varName}}} replacement`;
            try {
              const replaced = replaceVariables(testStr, dataForReplacement);
              varDebug.replacement = replaced.replace('Test ', '').replace(' replacement', '');
              if (process.env.NODE_ENV !== 'production') {
                console.log(`Replacement result: ${varDebug.replacement}`);
              }
            } catch (err) {
              console.error(`Error testing replacement for ${varName}:`, err);
              varDebug.replacement = `ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`;
            }
          }
          
          ruleDebug.variableReplacements.push(varDebug);
        }
        
        // Also add the complete variable report to the global report
        debugInfo.variableReport.push({
          templateId: template.id,
          templateName: template.name,
          variables: ruleDebug.variableReplacements
        });
      }
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('==== DEBUG COMPLETED ====');
    }
    
    // Return the debug information
    return res.status(200).json({
      success: true,
      form: debugInfo.form,
      emailRules: debugInfo.emailRules,
      variableReport: debugInfo.variableReport,
    });
    
  } catch (error: unknown) {
    console.error('Form submission debug error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      success: false,
      error: errorMessage
    });
  }
} 