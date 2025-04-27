/**
 * Debug API endpoint for Form System 2.0 styles
 * 
 * This endpoint returns detailed information about the styles for a Form System 2.0 form,
 * including the raw CSS, the form ID, and other debugging information.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Form ID is required' });
  }
  
  try {
    // Get all styles for this form (both form-specific and global)
    const styles = await prisma.formStyle.findMany({
      where: {
        OR: [
          { formId: id },
          { isGlobal: true }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Get the form details
    const form = await prisma.form.findUnique({
      where: { id }
    });
    
    // Return detailed debug information
    return res.status(200).json({
      formId: id,
      formExists: !!form,
      formDetails: form,
      totalStyles: styles.length,
      formSpecificStyles: styles.filter(s => s.formId === id).length,
      globalStyles: styles.filter(s => s.isGlobal).length,
      styles: styles.map(style => ({
        id: style.id,
        name: style.name,
        isGlobal: style.isGlobal,
        formId: style.formId,
        css: style.css,
        createdAt: style.createdAt,
        updatedAt: style.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching form styles:', error);
    return res.status(500).json({ error: 'Failed to fetch form styles' });
  }
}
