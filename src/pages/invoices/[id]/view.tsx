import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft, Download, History } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { generatePdfFromHtml } from '@/util/client-pdf';
import { InvoiceReplacementHistory } from '@/components/invoice/InvoiceReplacementHistory';

export default function ViewInvoice() {
  const router = useRouter();
  const { id, admin } = router.query;
  const [invoiceHtml, setInvoiceHtml] = useState<string>('');
  const [invoiceCss, setInvoiceCss] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [isVoided, setIsVoided] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hasReplacementHistory, setHasReplacementHistory] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (id) {
      fetchInvoiceHtml();
      
      // Add console security to prevent HTML inspection
      const consoleWarning = `
        ⚠️ Security Warning ⚠️
        Any attempt to modify this invoice is logged and may result in account suspension.
        This document is protected by security measures.
      `;
      
      // Override console methods
      const originalConsole = { ...console };
      console.log = function() {
        originalConsole.log(consoleWarning);
        return undefined;
      };
      console.dir = function() {
        originalConsole.log(consoleWarning);
        return undefined;
      };
      console.warn = function() {
        originalConsole.warn(consoleWarning);
        return undefined;
      };
      
      // Clean up on unmount
      return () => {
        console.log = originalConsole.log;
        console.dir = originalConsole.dir;
        console.warn = originalConsole.warn;
      };
    }
  }, [id]);

  const fetchInvoiceHtml = async () => {
    try {
      setLoading(true);
      
      // First, get the invoice status to check if it's voided
      const statusResponse = await fetch(`/api/invoices/${id}/get`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.invoice) {
          if (statusData.invoice.status === 'voided') {
            setIsVoided(true);
          }
          
          // Check if this invoice has replacement history
          if (statusData.invoice.originalInvoiceId || statusData.invoice.replacementInvoiceId) {
            setHasReplacementHistory(true);
          }
        }
      }
      
      const response = await fetch(`/api/invoices/${id}/html`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoice HTML');
      }
      
      const data = await response.json();
      
      // Get the HTML content
      let formattedHtml = data.html;
      
      // Replace ISO date format with a properly formatted date
      // This specifically targets the invoice date which is in ISO format
      const isoDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/g;
      formattedHtml = formattedHtml.replace(isoDateRegex, (isoDate: string) => {
        try {
          const date = new Date(isoDate);
          if (!isNaN(date.getTime())) {
            // Format as DD/MM/YYYY
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          }
          return isoDate; // Return original if parsing fails
        } catch (error) {
          console.error('Error formatting date:', error);
          return isoDate; // Return original if error occurs
        }
      });
      
      setInvoiceHtml(formattedHtml);
      setInvoiceCss(data.css);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching invoice HTML:', err);
      setLoading(false);
      setError('Failed to load invoice. Please try again later.');
    }
  };

  const generatePdf = async () => {
    if (!id) return;
    
    try {
      setGeneratingPdf(true);
      
      // Use the improved invoice PDF generation function
      const { generateInvoicePdf } = await import('@/util/client-pdf');
      await generateInvoicePdf(id as string, `invoice-${id}.pdf`);
      
      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error) {
      console.error('Error in PDF generation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          {/* Only show back button if user is authenticated */}
          {admin === 'true' && (
            <Link href="/dashboard/invoices">
              <Button variant="outline" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Invoices
              </Button>
            </Link>
          )}
          <h1 className="text-2xl font-bold">Invoice</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
          {!loading && !error && admin === 'true' && hasReplacementHistory && (
            <Button 
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              className="mb-2 sm:mb-0"
            >
              <History className="h-4 w-4 mr-2" />
              {showHistory ? 'Hide History' : 'View History'}
            </Button>
          )}
          {!loading && !error && (
            <Button 
              onClick={generatePdf}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <>
                  <span className="animate-spin mr-2">↻</span> Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Show replacement history if requested */}
      {showHistory && admin === 'true' && id && typeof id === 'string' && (
        <div className="mb-6">
          <InvoiceReplacementHistory invoiceId={id} />
        </div>
      )}

      <Card className="p-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[600px] w-full" />
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-red-500">{error}</p>
            {router.query.admin === 'true' ? (
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/invoices')}
                className="mt-4"
              >
                Return to Invoices
              </Button>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                If you believe this is an error, please contact the administrator.
              </p>
            )}
          </div>
        ) : (
          <div className="border rounded-md p-0 min-h-[500px] bg-white relative">
            {isVoided && (
              <div className="absolute top-0 right-0 z-10 transform rotate-45 translate-x-[40px] translate-y-[20px] bg-red-600 text-white py-1 px-16 font-bold text-lg shadow-md">
                VOIDED
              </div>
            )}
            <iframe
              ref={iframeRef}
              id="invoice-iframe"
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                      ${invoiceCss}
                      /* Base styles to ensure consistent rendering */
                      body {
                        margin: 0 auto;
                        padding: 20px;
                        font-family: Arial, sans-serif;
                        line-height: 1.5;
                        color: #333;
                        background-color: white;
                        max-width: 800px;
                        pointer-events: none !important;
                      }
                      /* Print-specific styles */
                      @media print {
                        body {
                          -webkit-print-color-adjust: exact !important;
                          print-color-adjust: exact !important;
                        }
                      }
                      /* Ensure images are loaded with correct dimensions */
                      img { max-width: 100%; height: auto; }
                      
                      /* Make everything non-interactive */
                      * {
                        pointer-events: none !important;
                        user-select: none !important;
                      }
                      
                      /* Hide all buttons and interactive elements */
                      button, 
                      [role="button"],
                      [contenteditable="true"],
                      input,
                      select,
                      textarea,
                      .edit-button,
                      .add-button,
                      .add,
                      [aria-label="Edit"],
                      [aria-label="Add"] {
                        display: none !important;
                      }
                      
                      /* Payment details styles */
                      .payment-details {
                        margin-top: 20px;
                        padding: 15px;
                        border: 1px solid #e2e8f0;
                        border-radius: 5px;
                        background-color: #f8fafc;
                      }
                      
                      .payment-details h3 {
                        margin-top: 0;
                        font-size: 1.1rem;
                        color: #334155;
                      }
                      
                      .payment-details p {
                        margin: 5px 0;
                      }
                      
                      .payment-badge {
                        display: inline-block;
                        padding: 3px 8px;
                        border-radius: 4px;
                        font-size: 0.8rem;
                        font-weight: 500;
                      }
                      
                      .payment-badge.paid {
                        background-color: #dcfce7;
                        color: #166534;
                      }
                      
                      .payment-badge.pending {
                        background-color: #fef3c7;
                        color: #92400e;
                      }
                    </style>
                    <script>
                      // Prevent right-click context menu
                      document.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        return false;
                      });
                      
                      // Basic protection for the content
                      window.addEventListener('DOMContentLoaded', function() {
                        document.body.setAttribute('data-protected', 'true');
                      });
                    </script>
                  </head>
                  <body>
                    <div class="protected-content" style="position: relative;">
                      ${invoiceHtml}
                    </div>
                  </body>
                </html>
              `}
              className="w-full h-[600px] border-0"
              title="Invoice Preview"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        )}
      </Card>
    </div>
  );
}