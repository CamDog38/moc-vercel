// This function will be used on the client side only
export const generatePdfFromHtml = async (html: string, css: string, filename: string = 'invoice.pdf') => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Starting PDF generation...');
    }
    
    // Dynamically import the required libraries
    const [jsPDFModule, html2canvasModule] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);
    
    const jsPDF = jsPDFModule.default;
    const html2canvas = html2canvasModule.default;
    
    // Create a container for the invoice content
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.width = '794px'; // A4 width in pixels at 96 DPI
    container.style.margin = '0';
    container.style.padding = '20px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '12px';
    container.style.lineHeight = '1.5';
    
    // Add a style tag with the CSS
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      ${css}
      
      /* Additional styles to ensure proper rendering */
      table { table-layout: fixed; width: 100%; border-collapse: collapse; }
      td, th { text-align: inherit; }
      [align="center"], [style*="text-align: center"] { text-align: center !important; }
      [align="right"], [style*="text-align: right"] { text-align: right !important; }
      
      /* Force images to load */
      img { display: inline-block !important; }
    `;
    container.prepend(styleTag);
    
    // Add to DOM temporarily
    document.body.appendChild(container);
    
    // Preload all images before rendering
    const preloadImages = async () => {
      const images = container.querySelectorAll('img');
      const imagePromises = Array.from(images).map(img => {
        return new Promise((resolve, reject) => {
          if (img.complete) {
            resolve(null);
          } else {
            img.onload = () => resolve(null);
            img.onerror = () => {
              console.error(`Failed to load image: ${img.src}`);
              resolve(null); // Resolve anyway to not block the PDF generation
            };
          }
        });
      });
      
      return Promise.all(imagePromises);
    };
    
    // Wait for images to load and styles to apply
    await Promise.all([
      preloadImages(),
      new Promise(resolve => setTimeout(resolve, 1500))
    ]);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Container added to DOM, rendering...');
    }
    
    // Create canvas from the container
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: 794, // Match A4 width
      onclone: (clonedDoc) => {
        // Additional adjustments to the cloned document if needed
        const clonedContainer = clonedDoc.querySelector('div');
        if (clonedContainer) {
          // Force all elements to have static layout
          const allElements = clonedContainer.querySelectorAll('*');
          allElements.forEach(el => {
            const element = el as HTMLElement;
            if (element.style) {
              element.style.position = element.style.position === 'absolute' ? 'absolute' : 'static';
            }
          });
        }
      }
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Canvas rendered, creating PDF...');
    }
    
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
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('PDF created, saving...');
    }
    
    // Save the PDF
    pdf.save(filename);
    
    // Clean up
    document.body.removeChild(container);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('PDF generation complete');
    }
    return true;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF: ' + (error instanceof Error ? error.message : String(error)));
  }
};

// Function to fetch invoice data and generate PDF
export const generateInvoicePdf = async (invoiceId: string, filename: string = 'invoice.pdf') => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Fetching invoice data for PDF generation: ${invoiceId}`);
    }
    
    // Fetch the invoice data from the API
    const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch invoice data: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.html) {
      throw new Error('No HTML content received from server');
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Invoice data received, generating PDF...');
    }
    
    // Generate the PDF using the HTML and CSS
    return await generatePdfFromHtml(data.html, data.css || '', filename);
    
  } catch (error) {
    console.error('Error in invoice PDF generation:', error);
    throw error;
  }
};