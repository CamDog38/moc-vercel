/**
 * Utility functions for PDF conversion using client-side libraries
 */
import { generatePdfFromHtml } from './client-pdf';

interface PDFConversionOptions {
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  format?: string;
  landscape?: boolean;
  printBackground?: boolean;
  scale?: number;
  pageRanges?: string;
  headerTemplate?: string;
  footerTemplate?: string;
  displayHeaderFooter?: boolean;
  preferCSSPageSize?: boolean;
}

/**
 * Converts HTML content to PDF using client-side libraries
 * 
 * @param html - The HTML content to convert
 * @param options - PDF conversion options
 * @returns Promise with the PDF as a Blob
 */
export async function convertHTMLToPDF(html: string, css: string = '', options: PDFConversionOptions = {}): Promise<Blob> {
  try {
    // Dynamically import the required libraries
    const [jsPDFModule, html2canvasModule] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);
    
    const jsPDF = jsPDFModule.default;
    const html2canvas = html2canvasModule.default;
    
    // Create a container for the content
    const container = document.createElement('div');
    container.innerHTML = `
      <html>
        <head>
          <style>${css}</style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;
    container.style.width = '794px'; // A4 width in pixels at 96 DPI
    container.style.margin = '0';
    container.style.padding = '20px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.backgroundColor = 'white';
    
    // Add to DOM temporarily
    document.body.appendChild(container);
    
    // Wait a moment for styles to apply
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create canvas from the container
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    // Calculate PDF dimensions (A4)
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate the number of pages
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    const pdfImgWidth = pdfWidth;
    const pdfImgHeight = pdfImgWidth / ratio;
    
    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 0, 0, pdfImgWidth, pdfImgHeight);
    
    // If the content is longer than one page, add more pages
    let heightLeft = pdfImgHeight - pdfHeight;
    let position = -pdfHeight;
    
    while (heightLeft > 0) {
      position = position - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfImgWidth, pdfImgHeight);
      heightLeft -= pdfHeight;
    }
    
    // Clean up
    document.body.removeChild(container);
    
    // Convert to blob
    const pdfBlob = pdf.output('blob');
    return pdfBlob;
  } catch (error) {
    console.error('Error in convertHTMLToPDF:', error);
    throw error;
  }
}

/**
 * Converts HTML content to PDF and downloads it
 * 
 * @param html - The HTML content to convert
 * @param filename - The name of the downloaded file (without extension)
 * @param options - PDF conversion options
 */
export async function downloadHTMLAsPDF(html: string, css: string = '', filename: string = 'document', options: PDFConversionOptions = {}): Promise<void> {
  try {
    // Use the client-side PDF generation directly
    await generatePdfFromHtml(html, css, `${filename}.pdf`);
  } catch (error) {
    console.error('Error in downloadHTMLAsPDF:', error);
    throw error;
  }
}

/**
 * Converts a PDF template to PDF using the template ID
 * 
 * @param templateId - The ID of the template to convert
 * @param data - Data to replace variables in the template
 * @returns Promise with the PDF as a Blob
 */
export async function convertTemplateToPDF(templateId: string, data: Record<string, any> = {}): Promise<Blob> {
  try {
    // Fetch the template data from the server
    const response = await fetch(`/api/pdf-templates/${templateId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch template');
    }

    const template = await response.json();
    
    // Import the template helpers
    const { processTemplateDirectives } = await import('./template-helpers');
    
    // Process the template with directives and variables
    const htmlContent = processTemplateDirectives(template.htmlContent, data);
    
    // Generate PDF using client-side method
    return await convertHTMLToPDF(htmlContent, template.cssContent || '');
  } catch (error) {
    console.error('Error in convertTemplateToPDF:', error);
    throw error;
  }
}

/**
 * Converts a PDF template to PDF and downloads it
 * 
 * @param templateId - The ID of the template to convert
 * @param filename - The name of the downloaded file (without extension)
 * @param data - Data to replace variables in the template
 */
export async function downloadTemplateAsPDF(templateId: string, filename: string | null = null, data: Record<string, any> = {}): Promise<void> {
  try {
    // Fetch the template data from the server
    const response = await fetch(`/api/pdf-templates/${templateId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch template');
    }

    const template = await response.json();
    
    // Import the template helpers
    const { processTemplateDirectives } = await import('./template-helpers');
    
    // Process the template with directives and variables
    const htmlContent = processTemplateDirectives(template.htmlContent, data);
    
    // Generate and download PDF using client-side method
    await downloadHTMLAsPDF(htmlContent, template.cssContent || '', filename || 'template');
  } catch (error) {
    console.error('Error in downloadTemplateAsPDF:', error);
    throw error;
  }
}