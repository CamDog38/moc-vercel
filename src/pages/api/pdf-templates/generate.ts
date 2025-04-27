import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { processTemplateDirectives } from '@/util/template-helpers';
import { getBaseUrl } from '@/util/url-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the user's role from the database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'User not found in database' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { templateId, data, entityId, entityType } = req.body;
    
    if (!templateId || !data) {
      return res.status(400).json({ error: 'Template ID and data are required' });
    }
    
    // Get the template
    const template = await prisma.pdfTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Process the template with directives and variables
    let htmlContent = processTemplateDirectives(template.htmlContent, data);
    
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
    
    // Log the PDF generation
    if (entityId && entityType) {
      // Store the PDF generation record in the database
      await prisma.$executeRaw`
        INSERT INTO "PdfGeneration" ("templateId", "entityId", "entityType", "userId", "metadata", "createdAt")
        VALUES (${templateId}, ${entityId}, ${entityType}, ${user.id}, ${JSON.stringify({ data })}, NOW())
      `;
    }
    
    // Return the HTML and CSS for client-side PDF generation
    return res.status(200).json({
      html: fullHtmlContent,
      css: template.cssContent || '',
      templateData: data,
      message: 'Use client-side PDF generation with jsPDF and html2canvas',
      filename: `${template.name.replace(/\s+/g, '_').toLowerCase()}.pdf`
    });
    
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template: ' + (error as Error).message });
  }
}