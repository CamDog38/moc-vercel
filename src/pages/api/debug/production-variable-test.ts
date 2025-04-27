import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { addApiLog } from './logs';
import { replaceVariables } from '@/util/email-template-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get parameters from either query or body
    const params = req.method === 'GET' ? req.query : req.body;
    const { submissionId, templateId } = params;

    // Log environment information
    addApiLog(`Environment: ${process.env.NODE_ENV || 'unknown'}`, 'info', 'emails');
    addApiLog(`Vercel environment: ${process.env.VERCEL_ENV || 'not Vercel'}`, 'info', 'emails');
    
    // Log Prisma client information
    addApiLog(`Prisma client info: ${JSON.stringify({
      provider: prisma._engineConfig?.activeProvider,
      clientVersion: prisma._clientVersion,
    })}`, 'info', 'emails');

    // If no submission ID is provided, create a test submission
    let submission;
    if (!submissionId) {
      // Create a test submission with all the fields we need
      submission = {
        id: `test-${Date.now()}`,
        data: {
          name: 'Test User',
          email: 'test@example.com',
          message: 'This is a test message'
        },
        timeStamp: Date.now().toString(),
        trackingToken: `test-token-${Date.now()}`,
        leadId: `test-lead-${Date.now()}`,
        createdAt: new Date()
      };
      addApiLog(`Created test submission with ID: ${submission.id}`, 'info', 'emails');
    } else {
      // Fetch the real submission
      submission = await prisma.formSubmission.findUnique({
        where: { id: submissionId },
        include: { lead: true }
      });

      if (!submission) {
        addApiLog(`Submission not found: ${submissionId}`, 'error', 'emails');
        return res.status(404).json({ error: 'Submission not found' });
      }
      addApiLog(`Found submission with ID: ${submissionId}`, 'success', 'emails');
    }

    // Log submission data structure
    addApiLog(`Submission data structure: ${JSON.stringify({
      id: submission.id,
      hasTimeStamp: submission.timeStamp !== undefined,
      timeStampType: typeof submission.timeStamp,
      timeStampValue: submission.timeStamp,
      hasTrackingToken: submission.trackingToken !== undefined,
      trackingTokenType: typeof submission.trackingToken,
      trackingTokenValue: submission.trackingToken,
      hasLeadId: submission.leadId !== undefined,
      leadIdType: typeof submission.leadId,
      leadIdValue: submission.leadId,
      dataKeys: Object.keys(submission.data || {})
    })}`, 'info', 'emails');

    // Prepare test data
    const testData = {
      submission,
      formSubmission: submission,
      trackingToken: submission.trackingToken,
      timeStamp: submission.timeStamp || Date.now().toString(), // Ensure timeStamp exists
      leadId: submission.leadId,
      // Flatten submission data
      ...(submission.data || {})
    };

    // Get template content
    let templateContent = '';
    let templateSubject = '';
    
    if (templateId) {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: templateId }
      });
      
      if (template) {
        templateContent = template.htmlContent;
        templateSubject = template.subject;
        addApiLog(`Found template: ${template.name}`, 'success', 'emails');
      } else {
        addApiLog(`Template not found: ${templateId}`, 'error', 'emails');
        templateContent = '<p>Hello {{name}},</p><p>This is a test with {{timeStamp}} and {{trackingToken}}.</p>';
        templateSubject = 'Test Subject for {{name}}';
      }
    } else {
      // Use default test template
      templateContent = '<p>Hello {{name}},</p><p>This is a test with {{timeStamp}} and {{trackingToken}}.</p>';
      templateSubject = 'Test Subject for {{name}}';
    }

    // Find all variables in the template
    const subjectVariables = templateSubject.match(/\{\{([^}]+)\}\}/g) || [];
    const bodyVariables = templateContent.match(/\{\{([^}]+)\}\}/g) || [];
    const allVariables = [...new Set([...subjectVariables, ...bodyVariables])];

    // Check variable availability
    const variableAvailability = {};
    for (const variable of allVariables) {
      const varName = variable.replace(/^\{\{|\}\}$/g, '').trim();
      
      // Skip conditional markers
      if (varName.startsWith('#if') || varName === '/if') continue;
      
      // Check in different locations
      if (testData[varName] !== undefined) {
        variableAvailability[varName] = {
          found: true,
          location: 'direct',
          type: typeof testData[varName],
          value: String(testData[varName])
        };
      } else if (testData.submission?.data?.[varName] !== undefined) {
        variableAvailability[varName] = {
          found: true,
          location: 'submission.data',
          type: typeof testData.submission.data[varName],
          value: String(testData.submission.data[varName])
        };
      } else {
        variableAvailability[varName] = {
          found: false,
          location: 'none'
        };
      }
    }

    // Process the templates
    const processedSubject = replaceVariables(templateSubject, testData);
    const processedContent = replaceVariables(templateContent, testData);

    // Return detailed results
    return res.status(200).json({
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        vercelEnv: process.env.VERCEL_ENV || 'not Vercel',
        isProduction: process.env.NODE_ENV === 'production'
      },
      prismaInfo: {
        provider: prisma._engineConfig?.activeProvider,
        clientVersion: prisma._clientVersion
      },
      submission: {
        id: submission.id,
        timeStamp: submission.timeStamp,
        timeStampType: typeof submission.timeStamp,
        trackingToken: submission.trackingToken,
        leadId: submission.leadId,
        dataKeys: Object.keys(submission.data || {})
      },
      template: {
        id: templateId || 'test-template',
        subject: templateSubject,
        content: templateContent
      },
      variables: {
        all: allVariables,
        availability: variableAvailability
      },
      processed: {
        subject: processedSubject,
        content: processedContent
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error in production variable test: ${errorMessage}`, 'error', 'emails');
    console.error('Error in production variable test:', error);
    return res.status(500).json({ 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : 'No stack trace available'
    });
  }
}