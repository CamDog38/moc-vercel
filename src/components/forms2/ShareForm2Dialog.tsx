import { useState } from "react";
import { Check, Copy, Link, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ShareForm2DialogProps {
  formId: string;
}

export function ShareForm2Dialog({ formId }: ShareForm2DialogProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  
  const formUrl = `${baseUrl}/forms2/${formId}/view`;
  const iframeCode = `<iframe src="${formUrl}" width="100%" height="800" frameborder="0"></iframe>`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(formUrl)}`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      // Fallback for environments where Clipboard API is not available
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Share Form">
          <Link className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share Form System 2.0</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">Direct Link</TabsTrigger>
            <TabsTrigger value="embed">Embed Code</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="mt-4">
            <div className="flex space-x-2">
              <Input value={formUrl} readOnly />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(formUrl, 'link')}
              >
                {copied === 'link' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="embed" className="mt-4">
            <div className="flex space-x-2">
              <Input value={iframeCode} readOnly />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(iframeCode, 'embed')}
              >
                {copied === 'embed' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Use this code to embed the form on your website.
            </p>
          </TabsContent>
          <TabsContent value="qr" className="mt-4">
            <div className="flex flex-col items-center justify-center space-y-4">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="border rounded-lg p-2"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(qrCodeUrl, 'qr')}
              >
                {copied === 'qr' ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                Copy QR Code URL
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
