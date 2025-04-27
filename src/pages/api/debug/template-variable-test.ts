import { NextApiRequest, NextApiResponse } from 'next';
import { processTemplate } from '@/lib/template-processor';
import { debugLog } from '@/lib/debug-log';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { template, variables } = req.body;

    if (!template) {
      return res.status(400).json({ error: 'Template is required' });
    }

    // Process the template with the variables
    const processedTemplate = processTemplate(template, variables);

    // Log the operation for debugging
    await debugLog.create({
      type: 'template-variable-test',
      data: {
        template,
        variables,
        processedTemplate,
      },
    });

    // Count the number of variables processed (excluding debug fields)
    const varCount = Object.keys(variables).filter(key => !['_debug', '_sections'].includes(key)).length;

    return res.status(200).json({ 
      processedTemplate,
      variableCount: varCount
    });
  } catch (error) {
    console.error('Error processing template:', error);
    return res.status(500).json({ error: 'Failed to process template' });
  }
}