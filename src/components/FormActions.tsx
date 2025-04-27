import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import QRCode from 'qrcode.react';
import { Database } from 'lucide-react';
import Link from 'next/link';

interface FormActionsProps {
  formId: string;
}

export function FormActions({ formId }: FormActionsProps) {
  const [showQR, setShowQR] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  
  const formUrl = `${window.location.origin}/forms/${formId}/view`;
  const embedCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0"></iframe>`;

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: message,
      });
    });
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        asChild
      >
        <Link href={`/dashboard/forms/${formId}/field-mappings`}>
          <Database className="h-4 w-4 mr-2" />
          Field Mappings
        </Link>
      </Button>
      
      <Button
        variant="outline"
        onClick={() => copyToClipboard(formUrl, "Form URL copied to clipboard!")}
      >
        Copy Form Link
      </Button>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogTrigger asChild>
          <Button variant="outline">QR Code</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Form QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 p-4">
            <QRCode value={formUrl} size={256} />
            <Button onClick={() => {
              const canvas = document.querySelector("canvas");
              if (canvas) {
                canvas.toBlob((blob) => {
                  if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'form-qr.png';
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                });
              }
            }}>
              Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
        <DialogTrigger asChild>
          <Button variant="outline">Embed Code</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Form</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              value={embedCode}
              readOnly
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              onClick={() => copyToClipboard(embedCode, "Embed code copied to clipboard!")}
            >
              Copy Embed Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}