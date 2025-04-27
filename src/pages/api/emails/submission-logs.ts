import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { submissionId } = req.query;
    
    if (!submissionId) {
      return res.status(400).json({ 
        error: 'Missing submission ID',
        message: 'A valid submission ID is required to view email logs'
      });
    }

    // Get the form submission
    const submission = await prisma.formSubmission.findUnique({
      where: { id: String(submissionId) },
      include: {
        form: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Form submission not found' });
    }

    // Check authentication for non-public access
    let userId = null;
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      userId = user.id;
      // Verify the user owns this form if they're authenticated
      if (submission.form.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to view this submission' });
      }
    }

    // For public access (no user), we'll only return minimal information
    // Get all email logs related to this submission
    const logs = await prisma.emailLog.findMany({
      where: {
        formSubmissionId: String(submissionId),
        ...(userId ? { userId } : {}), // Only filter by userId if authenticated
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all email rules for the form (only if authenticated)
    const rules = userId ? await prisma.emailRule.findMany({
      where: {
        formId: submission.formId,
        userId,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }) : [];

    // Get the rule evaluation results if they exist
    const ruleEvaluations = await prisma.emailRuleEvaluation.findMany({
      where: {
        formSubmissionId: String(submissionId),
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      submission: {
        id: submission.id,
        createdAt: submission.createdAt,
        formId: submission.formId,
        formName: submission.form.name,
      },
      logs: logs.map(log => ({
        id: log.id,
        status: log.status,
        recipient: log.recipient,
        subject: log.subject,
        createdAt: log.createdAt,
        templateName: log.template?.name || 'Unknown template',
      })),
      // Only include detailed rule info for authenticated users
      ...(userId ? { 
        rules,
        ruleEvaluations 
      } : {})
    });
  } catch (error) {
    console.error('Error fetching submission email logs:', error);
    return res.status(500).json({ error: 'Failed to fetch submission email logs' });
  }
}