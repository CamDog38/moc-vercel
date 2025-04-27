/**
 * Form System 2.0 - Update Form Style API
 * 
 * This API endpoint allows updating or creating styles for Form System 2.0 forms.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import * as logger from '@/util/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { css, name, isGlobal = false } = req.body;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Form ID is required' });
  }
  
  if (!css || typeof css !== 'string') {
    return res.status(400).json({ error: 'CSS content is required' });
  }

  try {
    logger.info(`[Forms2] Updating style for form ID: ${id}`, 'forms');
    
    // First check if the form exists
    const form = await prisma.form.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!form) {
      logger.error(`[Forms2] Form not found: ${id}`, 'forms');
      return res.status(404).json({ error: 'Form not found' });
    }
    
    // Check if a form-specific style already exists
    const existingStyle = await prisma.formStyle.findFirst({
      where: {
        formId: id,
        isGlobal: false
      }
    });
    
    let style;
    
    if (existingStyle) {
      // Update existing style
      style = await prisma.formStyle.update({
        where: { id: existingStyle.id },
        data: {
          cssContent: css,
          name: name || existingStyle.name
        }
      });
      
      logger.info(`[Forms2] Updated existing style: ${style.id}`, 'forms');
    } else {
      // Create new style
      style = await prisma.formStyle.create({
        data: {
          name: name || `Style for ${id}`,
          cssContent: css,
          isGlobal: isGlobal,
          formId: id,
          formSystemType: 'FORM2'
        }
      });
      
      logger.info(`[Forms2] Created new style: ${style.id}`, 'forms');
    }
    
    return res.status(200).json({
      success: true,
      style
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Forms2] Error updating form style: ${errorMessage}`, 'forms');
    return res.status(500).json({ error: 'Failed to update form style' });
  }
}
