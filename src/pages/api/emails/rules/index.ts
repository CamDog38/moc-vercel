import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getEmailRules(req, res, user.id);
    case 'POST':
      return createEmailRule(req, res, user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get all email rules for the user
async function getEmailRules(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    // Add retry logic for database connection issues
    let retries = 3;
    let rules;
    
    while (retries > 0) {
      try {
        rules = await prisma.emailRule.findMany({
          where: { userId },
          include: {
            template: {
              select: {
                id: true,
                name: true,
                subject: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        break; // If successful, exit the retry loop
      } catch (err) {
        retries--;
        // If this is the last retry and it failed, throw the error
        if (retries === 0) {
          throw err;
        }
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 500 * (3 - retries)));
      }
    }
    
    return res.status(200).json(rules);
  } catch (error) {
    console.error('Error fetching email rules:', error);
    
    // Provide more specific error messages for common database issues
    if (error instanceof Error) {
      const errorMessage = error.message;
      if (errorMessage.includes('Max client connections reached')) {
        return res.status(503).json({ 
          error: 'Database connection limit reached. Please try again in a moment.',
          details: errorMessage
        });
      }
    }
    
    return res.status(500).json({ 
      error: 'Failed to fetch email rules',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Create a new email rule
async function createEmailRule(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { 
      name, 
      description, 
      conditions, 
      templateId, 
      formId, 
      active, 
      folder, 
      ccEmails, 
      bccEmails,
      recipientType,
      recipientEmail,
      recipientField
    } = req.body;

    if (!name || !conditions || !templateId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate that the template exists and belongs to the user
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    // Validate recipient information
    if (recipientType === 'custom' && !recipientEmail) {
      return res.status(400).json({ error: 'Custom recipient email is required when using custom recipient type' });
    }

    if (recipientType === 'field' && !recipientField) {
      return res.status(400).json({ error: 'Recipient field is required when using field recipient type' });
    }

    // Prepare conditions for saving
    let conditionsToSave;
    
    if (conditions !== undefined) {
      // Handle different formats of conditions
      if (typeof conditions === 'string') {
        // If it's already a string, use it directly
        conditionsToSave = conditions;
      } else if (Array.isArray(conditions)) {
        // If it's an array, stringify it
        conditionsToSave = JSON.stringify(conditions);
      } else if (typeof conditions === 'object') {
        // If it's an object (but not an array), stringify it
        conditionsToSave = JSON.stringify(conditions);
      } else {
        // Default to empty array
        conditionsToSave = '[]';
      }
    } else {
      // If no conditions provided, default to empty
      conditionsToSave = '[]';
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Creating rule with conditions:', conditionsToSave);
    }
    
    // Create the rule
    const rule = await prisma.emailRule.create({
      data: {
        name,
        description: description || '',
        conditions: conditionsToSave,
        templateId,
        formId,
        active: active !== undefined ? active : true,
        folder: folder || null,
        ccEmails: ccEmails || null,
        bccEmails: bccEmails || null,
        recipientType: recipientType || 'form',
        recipientEmail: recipientType === 'custom' ? recipientEmail : null,
        recipientField: recipientType === 'field' ? recipientField : null,
        userId,
      },
    });

    return res.status(201).json(rule);
  } catch (error) {
    console.error('Error creating email rule:', error);
    return res.status(500).json({ error: 'Failed to create email rule' });
  }
}