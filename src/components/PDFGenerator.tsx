import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { generatePdfFromHtml } from '@/util/client-pdf';

interface PDFGeneratorProps {
  html: string;
  css?: string;
  filename?: string;
  buttonText?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

/**
 * A reusable component for client-side PDF generation
 */
export default function PDFGenerator({
  html,
  css = '',
  filename = 'document.pdf',
  buttonText = 'Download PDF',
  className = '',
  variant = 'default'
}: PDFGeneratorProps) {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    if (!html) {
      toast({
        title: "Error",
        description: "No content available for PDF generation",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      
      // Use client-side PDF generation
      await generatePdfFromHtml(html, css, filename);
      
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
      setGenerating(false);
    }
  };

  return (
    <Button 
      onClick={handleGeneratePDF}
      className={className}
      disabled={generating || !html}
      variant={variant}
    >
      {generating ? (
        <>
          <span className="animate-spin mr-2">↻</span> Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          {buttonText}
        </>
      )}
    </Button>
  );
}