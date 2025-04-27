/**
 * Form System 2.0 - Public Form Meta API
 * 
 * This API endpoint returns basic metadata about a form without requiring authentication.
 * It's used by the public form view to get the form title and other basic information.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import * as logger from '@/util/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Form ID is required' });
  }

  try {
    logger.info(`Fetching form meta for ID: ${id}`, 'forms');
    
    // Get basic form information
    const form = await prisma.form.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,  // Form System 2.0 uses isActive instead of isPublic
        userId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!form) {
      logger.error(`Form not found: ${id}`, 'forms');
      return res.status(404).json({ error: 'Form not found' });
    }
    
    // Check if form is active (public)
    if (!form.isActive) {
      logger.error(`Form is not active: ${id}`, 'forms');
      return res.status(403).json({ error: 'Form is not available' });
    }
    
    // Return basic form metadata
    return res.status(200).json({
      id: form.id,
      title: form.name,
      description: form.description,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error fetching form meta: ${errorMessage}`, 'forms');
    return res.status(500).json({ error: 'Failed to fetch form metadata' });
  }
}
