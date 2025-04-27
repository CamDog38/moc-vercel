import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  className?: string;
  height?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = 'html',
  className,
  height = '500px',
}: CodeEditorProps) {
  const [isEditing, setIsEditing] = useState(true);
  
  const handleBeautify = () => {
    try {
      // Simple HTML beautifier
      let formatted = '';
      let indent = 0;
      const lines = value.replace(/>\s*</g, '>\n<').split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for closing tags or self-closing tags
        if (line.match(/^<\/\w/) && indent > 0) {
          indent -= 1;
        }
        
        // Add the line with proper indentation
        formatted += ' '.repeat(indent * 2) + line + '\n';
        
        // Check for opening tags (but not self-closing or DOCTYPE)
        if (line.match(/^<\w[^>]*[^\/]>$/) && !line.match(/^<(img|br|hr|input|link|meta)/i)) {
          indent += 1;
        }
      }
      
      onChange(formatted);
      toast({
        title: "Code Beautified",
        description: "Your HTML has been formatted for better readability",
      });
    } catch (error) {
      console.error('Error beautifying code:', error);
      toast({
        title: "Beautify Failed",
        description: "There was an error formatting your HTML",
        variant: "destructive",
      });
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(value);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
      duration: 2000,
    });
  };

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      <div className="bg-muted p-2 flex justify-between items-center border-b">
        <div className="flex items-center space-x-2">
          <Button 
            variant={isEditing ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
          <Button 
            variant={!isEditing ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsEditing(false)}
          >
            Preview
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={handleBeautify}>
                Beautify
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                Copy
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div style={{ height }} className="relative">
        {isEditing ? (
          <div className="flex h-full">
            <div className="bg-muted text-muted-foreground text-right p-2 pt-3 text-xs font-mono border-r w-12">
              {value.split('\n').map((_, i) => (
                <div key={i} className="leading-5">{i + 1}</div>
              ))}
            </div>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="font-mono text-sm resize-none rounded-none border-0 h-full flex-1 focus-visible:ring-0"
              style={{ 
                padding: '0.5rem',
                lineHeight: '1.25rem',
                whiteSpace: 'pre',
                overflowWrap: 'normal',
                overflowX: 'auto'
              }}
            />
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              showLineNumbers
              customStyle={{
                margin: 0,
                height: '100%',
                fontSize: '0.875rem',
              }}
            >
              {value}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    </div>
  );
}