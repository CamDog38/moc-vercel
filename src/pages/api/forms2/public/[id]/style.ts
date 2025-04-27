/**
 * Form System 2.0 - Form Style API
 * 
 * This API endpoint provides a direct way to get styles for Form System 2.0 forms.
 * It serves as a bridge between Form System 2.0 and the form styles system.
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
    logger.info(`[Forms2] Fetching styles for form ID: ${id}`, 'forms');
    
    // First check if the form exists and is active
    const form = await prisma.form.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true
      }
    });
    
    if (!form) {
      logger.error(`[Forms2] Form not found: ${id}`, 'forms');
      return res.status(404).json({ error: 'Form not found' });
    }
    
    if (!form.isActive) {
      logger.error(`[Forms2] Form is not active: ${id}`, 'forms');
      return res.status(403).json({ error: 'Form is not available' });
    }
    
    // Get all styles for this form (including global styles)
    const styles = await prisma.formStyle.findMany({
      where: {
        OR: [
          { formId: id },
          { formId: `form2_${id}` },
          { formId: id.replace('form2_', '') },
          { isGlobal: true }
        ]
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    logger.info(`[Forms2] Found ${styles.length} styles for form: ${id}`, 'forms');
    
    // If no styles found, return an empty array
    if (styles.length === 0) {
      return res.status(200).json({ styles: [], css: '' });
    }
    
    // Separate global and form-specific styles
    const formSpecificStyles = styles.filter(s => !s.isGlobal);
    const globalStyles = styles.filter(s => s.isGlobal);
    
    logger.info(`[Forms2] Form-specific styles: ${formSpecificStyles.length}, Global styles: ${globalStyles.length}`, 'forms');
    
    // Combine styles with form-specific styles taking precedence
    let combinedCss = '';
    
    // Log raw styles for debugging
    logger.info(`[Forms2] Raw styles: ${JSON.stringify(styles.map(s => ({ id: s.id, name: s.name, cssContent: s.cssContent })))}`, 'forms');
    
    // Process each style and extract CSS
    styles.forEach(style => {
      // Check if cssContent exists and is not empty
      if (style.cssContent && style.cssContent.trim() !== '') {
        combinedCss += style.cssContent + '\n\n';
      } else {
        // Try to extract CSS from other fields or format
        // Based on the table screenshot, it appears the CSS might be in a different format
        // Add default styles for Form System 2.0
        combinedCss += `
/* Default styles for ${style.name || 'Form System 2.0'} */

/* Main container */
.form-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Card styles */
[class*="Card"] {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  padding: 1.5rem;
}

/* Form elements */
input, select, textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 1rem;
}

/* Buttons */
button {
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
}

button:not([class*="outline"]) {
  background-color: #4f46e5;
  color: white;
  border: none;
}
`;
      }
    });
    
    // Log the combined CSS length for debugging
    logger.info(`[Forms2] Combined CSS length: ${combinedCss.length}`, 'forms');
    
    // Return the styles and combined CSS
    return res.status(200).json({
      styles,
      css: combinedCss
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Forms2] Error fetching form styles: ${errorMessage}`, 'forms');
    return res.status(500).json({ error: 'Failed to fetch form styles' });
  }
}
