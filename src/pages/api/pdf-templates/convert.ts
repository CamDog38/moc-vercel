import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';
import { processTemplateDirectives } from '@/util/template-helpers';
import { getBaseUrl } from '@/util/url-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the user
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the template ID and data from the request (either query params or body)
    const templateId = req.method === 'GET' ? req.query.templateId as string : req.body.templateId;
    const templateData = req.method === 'GET' ? {} : (req.body.data || {});

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Fetch the template from the database
    const template = await prisma.pdfTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Converting template with client-side approach...');
    }
    
    // Process the template with directives and variables
    let htmlContent = processTemplateDirectives(template.htmlContent, templateData);
    
    // Get the base URL for absolute paths
    const baseUrl = getBaseUrl(req);
    
    // Convert relative image paths to absolute URLs
    htmlContent = htmlContent.replace(/(src=["'])\/([^"']*["'])/g, `$1${baseUrl}/$2`);
    htmlContent = htmlContent.replace(/(src=["'])(?!http)(images\/[^"']*["'])/g, `$1${baseUrl}/$2`);
    htmlContent = htmlContent.replace(/(src=["'])(?!http|\/|data:)([^"']*["'])/g, `$1${baseUrl}/$2`);
    
    // Create a static version of the HTML by wrapping it in a container
    const staticHtmlContent = `
      <div class="template-static-view">
        ${htmlContent}
      </div>
    `;
    
    // Prepare a complete HTML document with proper CSS handling
    const fullHtmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Base styles to ensure consistent rendering */
            body {
              margin: 0 auto;
              padding: 20px;
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.5;
              color: #333;
              background-color: white;
              max-width: 794px; /* A4 width in pixels at 96 DPI */
              box-sizing: border-box;
            }
            
            /* Print-specific styles */
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                width: 794px !important;
              }
              
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
              }
            }
            
            /* Ensure images are loaded with correct dimensions */
            img { max-width: 100%; height: auto; }
            
            /* Make the template view static */
            .template-static-view {
              pointer-events: none !important;
              width: 100% !important;
              box-sizing: border-box !important;
            }
            
            /* Ensure table layouts are fixed */
            table {
              table-layout: fixed;
              width: 100%;
              border-collapse: collapse;
            }
            
            /* Preserve text alignment in table cells */
            td, th {
              text-align: inherit;
            }
            
            /* Ensure centered text stays centered */
            [align="center"], [style*="text-align: center"] {
              text-align: center !important;
            }
            
            /* Ensure right-aligned text stays right-aligned */
            [align="right"], [style*="text-align: right"] {
              text-align: right !important;
            }
            
            /* Template CSS */
            ${template.cssContent || ''}
          </style>
        </head>
        <body>
          ${staticHtmlContent}
        </body>
      </html>
    `;
    
    // Return the HTML and CSS for client-side PDF generation
    return res.status(200).json({
      html: fullHtmlContent,
      css: template.cssContent || '',
      templateData: templateData,
      message: 'Use client-side PDF generation with jsPDF and html2canvas'
    });
    
  } catch (error) {
    console.error('Error converting template:', error);
    res.status(500).json({ error: 'Failed to convert template: ' + (error as Error).message });
  }
}