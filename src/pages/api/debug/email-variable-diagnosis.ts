import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { addApiLog } from './logs';
import { replaceVariables } from '@/util/email-template-helpers';

/**
 * This endpoint provides comprehensive diagnostics for email variable replacement issues
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { submissionId, templateId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submissionId parameter' });
    }

    // Fetch the form submission with all related data
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        form: true,
        lead: true,
        booking: true,
        emailLogs: {
          include: {
            template: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        },
        ruleEvaluations: {
          include: {
            rule: {
              include: {
                template: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Fetch the template if provided
    let template = null;
    if (templateId) {
      template = await prisma.emailTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
    } else if (submission.emailLogs.length > 0) {
      // Use the most recent email log's template
      template = submission.emailLogs[0].template;
    } else if (submission.ruleEvaluations.length > 0 && submission.ruleEvaluations[0].rule.template) {
      // Use the most recent rule evaluation's template
      template = submission.ruleEvaluations[0].rule.template;
    }

    if (!template) {
      return res.status(400).json({ error: 'No template found or provided' });
    }

    // Create the data object for variable replacement
    const formData = submission.data || {};
    
    // Prepare the normalized data structure
    const normalizedData = {
      // Basic submission data
      submission: submission,
      formSubmission: submission,
      formData: formData,
      
      // Important fields
      timeStamp: submission.timeStamp || Date.now().toString(),
      trackingToken: submission.trackingToken,
      leadId: submission.leadId,
      
      // Related entities
      form: submission.form,
      lead: submission.lead,
      booking: submission.booking,
      
      // Flatten form data to top level
      ...formData
    };

    // Extract all variables from the template
    const subjectVariables = (template.subject.match(/\{\{([^}]+)\}\}/g) || [])
      .map(v => v.slice(2, -2).trim());
    
    const bodyVariables = (template.htmlContent.match(/\{\{([^}]+)\}\}/g) || [])
      .map(v => v.slice(2, -2).trim());
    
    // Combine and deduplicate variables
    const allVariables = [...new Set([...subjectVariables, ...bodyVariables])];
    
    // Check each variable's availability in the data
    const variableAnalysis = allVariables.map(variable => {
      // Skip conditional markers
      if (variable.startsWith('#if') || variable === '/if') {
        return {
          variable,
          isConditional: true,
          exists: false,
          value: null,
          source: 'conditional'
        };
      }
      
      // Check different locations for the variable
      let exists = false;
      let value = null;
      let source = 'not found';
      
      // Check direct top-level access
      if (normalizedData[variable] !== undefined) {
        exists = true;
        value = normalizedData[variable];
        source = 'top level';
      }
      // Check in formData
      else if (normalizedData.formData && normalizedData.formData[variable] !== undefined) {
        exists = true;
        value = normalizedData.formData[variable];
        source = 'formData';
      }
      // Check for nested path
      else if (variable.includes('.')) {
        const parts = variable.split('.');
        let currentObj = normalizedData;
        let found = true;
        
        for (const part of parts) {
          if (currentObj && typeof currentObj === 'object' && part in currentObj) {
            currentObj = currentObj[part];
          } else {
            found = false;
            break;
          }
        }
        
        if (found) {
          exists = true;
          value = currentObj;
          source = 'nested path';
        }
      }
      
      return {
        variable,
        exists,
        value: exists ? String(value) : null,
        source
      };
    });
    
    // Test the variable replacement
    const processedSubject = replaceVariables(template.subject, normalizedData);
    const processedBody = replaceVariables(template.htmlContent, normalizedData);
    
    // Check for variables that weren't replaced
    const unreplacedSubjectVars = (processedSubject.match(/\{\{([^}]+)\}\}/g) || [])
      .map(v => v.slice(2, -2).trim());
    
    const unreplacedBodyVars = (processedBody.match(/\{\{([^}]+)\}\}/g) || [])
      .map(v => v.slice(2, -2).trim());
    
    // Combine and deduplicate unreplaced variables
    const allUnreplacedVars = [...new Set([...unreplacedSubjectVars, ...unreplacedBodyVars])];
    
    // Prepare the diagnostic report
    const diagnosticReport = {
      submission: {
        id: submission.id,
        formId: submission.formId,
        leadId: submission.leadId,
        bookingId: submission.bookingId,
        createdAt: submission.createdAt,
        timeStamp: submission.timeStamp,
        trackingToken: submission.trackingToken,
        // Add detailed tracking token information
        trackingTokenDetails: submission.trackingToken ? {
          value: submission.trackingToken,
          format: submission.trackingToken.includes('-') ? 'valid' : 'invalid',
          parts: submission.trackingToken.split('-'),
          length: submission.trackingToken.length
        } : null
      },
      template: {
        id: template.id,
        name: template.name,
        type: template.type
      },
      variableAnalysis: {
        total: allVariables.length,
        found: variableAnalysis.filter(v => v.exists).length,
        notFound: variableAnalysis.filter(v => !v.exists && !v.isConditional).length,
        conditionals: variableAnalysis.filter(v => v.isConditional).length,
        details: variableAnalysis
      },
      replacementResults: {
        unreplacedVariables: allUnreplacedVars,
        subjectBefore: template.subject,
        subjectAfter: processedSubject,
        bodyBeforeLength: template.htmlContent.length,
        bodyAfterLength: processedBody.length,
        subjectFullyProcessed: unreplacedSubjectVars.length === 0,
        bodyFullyProcessed: unreplacedBodyVars.length === 0
      },
      dataStructure: {
        topLevelKeys: Object.keys(normalizedData),
        formDataKeys: Object.keys(normalizedData.formData || {}),
        hasTimeStamp: !!normalizedData.timeStamp,
        hasTrackingToken: !!normalizedData.trackingToken,
        hasLeadId: !!normalizedData.leadId
      }
    };
    
    // Log the diagnostic results
    addApiLog(`Email variable diagnostic completed for submission ${submissionId}`, 'info', 'emails');
    addApiLog(`Found ${diagnosticReport.variableAnalysis.found} of ${diagnosticReport.variableAnalysis.total} variables`, 'info', 'emails');
    
    if (diagnosticReport.variableAnalysis.notFound > 0) {
      addApiLog(`${diagnosticReport.variableAnalysis.notFound} variables not found in data`, 'error', 'emails');
      
      // Log the missing variables
      const missingVars = variableAnalysis
        .filter(v => !v.exists && !v.isConditional)
        .map(v => v.variable);
      
      addApiLog(`Missing variables: ${missingVars.join(', ')}`, 'error', 'emails');
    }
    
    return res.status(200).json(diagnosticReport);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error in email variable diagnosis: ${errorMessage}`, 'error', 'emails');
    return res.status(500).json({ error: errorMessage });
  }
}