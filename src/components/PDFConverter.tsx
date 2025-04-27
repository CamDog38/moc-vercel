import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { generatePdfFromHtml } from '@/util/client-pdf';

export default function PDFConverter() {
  const [html, setHtml] = useState<string>('<h1>Hello World</h1><p>This is a sample PDF document.</p>');
  const [css, setCss] = useState<string>('body { font-family: Arial, sans-serif; }');
  const [filename, setFilename] = useState<string>('document');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const { toast } = useToast();

  const handleConvert = async () => {
    if (!html.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some HTML content',
        variant: 'destructive',
      });
      return;
    }

    setIsConverting(true);
    try {
      // Use client-side PDF generation
      await generatePdfFromHtml(html, css, `${filename}.pdf`);
      
      toast({
        title: 'Success',
        description: 'PDF has been generated and downloaded',
      });
    } catch (error) {
      console.error('Error converting to PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to convert HTML to PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>HTML to PDF Converter</CardTitle>
        <CardDescription>
          Enter HTML content and CSS below to convert it to a downloadable PDF document
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="filename">Filename</Label>
          <Input
            id="filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Enter filename (without extension)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="html-content">HTML Content</Label>
          <Textarea
            id="html-content"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="Enter HTML content here"
            className="min-h-[200px] font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="css-content">CSS Styles (optional)</Label>
          <Textarea
            id="css-content"
            value={css}
            onChange={(e) => setCss(e.target.value)}
            placeholder="Enter CSS styles here"
            className="min-h-[100px] font-mono"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleConvert} 
          disabled={isConverting}
          className="w-full"
        >
          {isConverting ? 'Converting...' : 'Convert to PDF'}
        </Button>
      </CardFooter>
    </Card>
  );
}