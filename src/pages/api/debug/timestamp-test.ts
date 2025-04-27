import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { addApiLog } from './logs';
import { replaceVariables } from '@/util/email-template-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submissionId parameter' });
    }

    addApiLog(`Testing timestamp variable replacement for submission: ${submissionId}`, 'info', 'emails');

    // Fetch the submission
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        lead: true,
        form: true
      }
    });

    if (!submission) {
      addApiLog(`Submission not found: ${submissionId}`, 'error', 'emails');
      return res.status(404).json({ error: 'Submission not found' });
    }

    addApiLog(`Found submission with ID: ${submissionId}`, 'success', 'emails');
    addApiLog(`Submission data: ${JSON.stringify({
      id: submission.id,
      trackingToken: submission.trackingToken,
      timeStamp: submission.timeStamp,
      sourceLeadId: submission.sourceLeadId,
      leadId: submission.leadId,
      createdAt: submission.createdAt
    })}`, 'info', 'emails');

    // Create test data with the submission
    const testData = {
      submission,
      formSubmission: submission,
      trackingToken: submission.trackingToken,
      timeStamp: submission.timeStamp,
      sourceLeadId: submission.sourceLeadId,
      leadId: submission.leadId,
      // Add lead data if available
      ...(submission.lead ? { lead: submission.lead } : {}),
      // Add form data if available
      ...(submission.form ? { form: submission.form } : {})
    };

    // Test templates with different variable formats
    const testTemplates = [
      "Timestamp: {{timeStamp}}",
      "Lead ID: {{leadId}}",
      "Tracking Token: {{trackingToken}}",
      "Source Lead ID: {{sourceLeadId}}",
      "Combined: {{leadId}}-{{timeStamp}}",
      "Submission Timestamp: {{submission.timeStamp}}",
      "Form Submission Timestamp: {{formSubmission.timeStamp}}"
    ];

    // Process each test template
    const results = testTemplates.map(template => {
      const result = replaceVariables(template, testData);
      addApiLog(`Template "${template}" replaced as: "${result}"`, 'info', 'emails');
      return { template, result };
    });

    // Generate a tracking token using the format leadId-timestamp
    let generatedToken = '';
    if (submission.leadId) {
      const timestamp = submission.timeStamp || Date.now().toString();
      generatedToken = `${submission.leadId}-${timestamp}`;
      addApiLog(`Generated tracking token: ${generatedToken}`, 'info', 'emails');
    }

    return res.status(200).json({
      submission: {
        id: submission.id,
        trackingToken: submission.trackingToken,
        timeStamp: submission.timeStamp,
        sourceLeadId: submission.sourceLeadId,
        leadId: submission.leadId,
        createdAt: submission.createdAt
      },
      results,
      generatedToken
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error in timestamp test: ${errorMessage}`, 'error', 'emails');
    return res.status(500).json({ error: errorMessage });
  }
}