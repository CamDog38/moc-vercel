import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get user role
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userData.user.id },
  });

  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid webhook ID' });
  }

  try {
    // Check if webhook exists
    const webhook = await prisma.zapierWebhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return res.status(200).json(webhook);

      case 'PUT':
      case 'PATCH':
        const { name, url, description, isActive, variables } = req.body;
        
        // Validate URL format if provided
        if (url) {
          try {
            new URL(url);
          } catch (error) {
            return res.status(400).json({ error: 'Invalid URL format' });
          }
        }

        // Validate variables if provided
        let parsedVariables = undefined;
        if (variables !== undefined) {
          try {
            if (typeof variables === 'string') {
              parsedVariables = JSON.parse(variables);
            } else {
              parsedVariables = variables;
            }
          } catch (error) {
            return res.status(400).json({ error: 'Invalid variables format. Must be valid JSON.' });
          }
        }

        const updatedWebhook = await prisma.zapierWebhook.update({
          where: { id },
          data: {
            name: name ?? webhook.name,
            url: url ?? webhook.url,
            description: description !== undefined ? description : webhook.description,
            variables: parsedVariables !== undefined ? parsedVariables : webhook.variables,
            isActive: isActive !== undefined ? isActive : webhook.isActive,
          },
        });
        
        return res.status(200).json(updatedWebhook);

      case 'DELETE':
        await prisma.zapierWebhook.delete({
          where: { id },
        });
        
        return res.status(200).json({ message: 'Webhook deleted successfully' });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Webhook API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}