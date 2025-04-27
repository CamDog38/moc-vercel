import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Plus, Trash, Code, FileJson, FormInput, AlertCircle, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WebhookVariable {
  key: string;
  value: string;
}

interface WebhookVariablesEditorProps {
  webhookId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function WebhookVariablesEditor({ 
  webhookId, 
  isOpen, 
  onClose, 
  onSave 
}: WebhookVariablesEditorProps) {
  const { toast } = useToast();
  const [variables, setVariables] = useState<WebhookVariable[]>([]);
  const [jsonMode, setJsonMode] = useState(true); // Default to JSON mode
  const [jsonValue, setJsonValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && webhookId) {
      fetchWebhookVariables();
    }
  }, [isOpen, webhookId]);

  const fetchWebhookVariables = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/webhooks/${webhookId}`);
      const data = await response.json();
      
      if (response.ok) {
        // Ensure we have variables, even if it's an empty object
        const webhookVariables = data.variables || {};
        
        // Convert to array for form mode
        const vars = Object.entries(webhookVariables).map(([key, value]) => ({
          key,
          value: String(value)
        }));
        
        setVariables(vars);
        
        // Format JSON for display
        setJsonValue(JSON.stringify(webhookVariables, null, 2));
        
        // Log for debugging
        if (process.env.NODE_ENV !== 'production') {
          console.log('Loaded webhook variables:', webhookVariables);
        }
      } else {
        setVariables([]);
        setJsonValue('{}');
        console.error('Failed to load webhook data:', data);
        toast({
          title: "Error",
          description: data.error || "Failed to load webhook data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching webhook variables:', error);
      setVariables([]);
      setJsonValue('{}');
      toast({
        title: "Error",
        description: "Failed to load webhook variables",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVariable = () => {
    setVariables([...variables, { key: '', value: '' }]);
  };

  const handleRemoveVariable = (index: number) => {
    const newVariables = [...variables];
    newVariables.splice(index, 1);
    setVariables(newVariables);
  };

  const handleVariableChange = (index: number, field: 'key' | 'value', value: string) => {
    const newVariables = [...variables];
    newVariables[index][field] = value;
    setVariables(newVariables);
  };

  const handleSaveVariables = async () => {
    try {
      setIsLoading(true);
      
      // Convert variables to object
      let variablesObject = {};
      
      if (jsonMode) {
        try {
          variablesObject = JSON.parse(jsonValue);
        } catch (error) {
          toast({
            title: "Invalid JSON",
            description: "Please check your JSON format",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Check for empty keys
        const hasEmptyKey = variables.some(v => !v.key.trim());
        if (hasEmptyKey) {
          toast({
            title: "Invalid Variables",
            description: "Variable keys cannot be empty",
            variant: "destructive",
          });
          return;
        }
        
        // Convert array to object
        variablesObject = variables.reduce((obj, item) => {
          obj[item.key] = item.value;
          return obj;
        }, {} as Record<string, string>);
      }
      
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variables: variablesObject }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Webhook variables updated successfully",
        });
        onSave();
        onClose();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update webhook variables');
      }
    } catch (error) {
      console.error('Error saving webhook variables:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save webhook variables",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    if (jsonMode) {
      // Convert JSON to variables array
      try {
        const parsed = JSON.parse(jsonValue);
        const vars = Object.entries(parsed).map(([key, value]) => ({
          key,
          value: String(value)
        }));
        setVariables(vars);
        setJsonMode(false);
      } catch (error) {
        toast({
          title: "Invalid JSON",
          description: "Cannot switch to form mode with invalid JSON",
          variant: "destructive",
        });
      }
    } else {
      // Convert variables array to JSON
      const obj = variables.reduce((acc, { key, value }) => {
        if (key.trim()) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);
      setJsonValue(JSON.stringify(obj, null, 2));
      setJsonMode(true);
    }
  };

  // Function to validate JSON
  const validateJson = (json: string): { valid: boolean; error?: string } => {
    try {
      JSON.parse(json);
      setJsonError(null);
      return { valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
      setJsonError(errorMessage);
      return { valid: false, error: errorMessage };
    }
  };

  // Function to handle JSON changes with validation
  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    validateJson(value);
  };

  // Function to copy JSON to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Function to format JSON
  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      setJsonValue(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
      setJsonError(errorMessage);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Webhook Variables</DialogTitle>
          <DialogDescription>
            Customize the JSON payload sent to this webhook. Use dot notation (e.g., "invoice.customField") for nested properties.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              {jsonMode ? (
                <FileJson className="h-5 w-5 text-blue-500" />
              ) : (
                <FormInput className="h-5 w-5 text-green-500" />
              )}
              <h3 className="text-sm font-medium">
                {jsonMode ? "JSON Editor" : "Variable Editor"}
              </h3>
            </div>
            <div className="flex gap-2">
              {jsonMode && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={formatJson}
                    className="flex items-center gap-1"
                  >
                    Format JSON
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyToClipboard}
                    className="flex items-center gap-1"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleMode}
                className="flex items-center gap-2"
              >
                <Code className="h-4 w-4" />
                {jsonMode ? "Switch to Form" : "Switch to JSON"}
              </Button>
            </div>
          </div>
          
          {jsonMode ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="jsonEditor" className="text-sm font-medium">
                  JSON Variables
                </Label>
                <span className="text-xs text-muted-foreground">
                  Edit the JSON directly or switch to form mode
                </span>
              </div>
              
              <div className="relative">
                <Textarea
                  id="jsonEditor"
                  value={jsonValue}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className="font-mono h-[350px] resize-none"
                  placeholder="{}"
                />
              </div>
              
              {jsonError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {jsonError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {variables.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No variables defined. Add a variable to customize the webhook payload.
                </div>
              ) : (
                <div className="max-h-[350px] overflow-y-auto space-y-4 pr-2">
                  {variables.map((variable, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Label htmlFor={`key-${index}`} className="sr-only">Key</Label>
                        <Input
                          id={`key-${index}`}
                          value={variable.key}
                          onChange={(e) => handleVariableChange(index, 'key', e.target.value)}
                          placeholder="Key (e.g., invoice.customField)"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={`value-${index}`} className="sr-only">Value</Label>
                        <Input
                          id={`value-${index}`}
                          value={variable.value}
                          onChange={(e) => handleVariableChange(index, 'value', e.target.value)}
                          placeholder="Value"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveVariable(index)}
                        className="mt-0"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddVariable}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Variable
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveVariables} 
            disabled={isLoading || (jsonMode && jsonError !== null)}
          >
            {isLoading ? "Saving..." : "Save Variables"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}