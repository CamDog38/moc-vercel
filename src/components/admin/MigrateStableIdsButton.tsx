/**
 * Migrate Stable IDs Button Component
 * 
 * This component provides a UI for administrators to migrate forms to use stable IDs.
 * It includes options for dry runs and single form migrations.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Database } from 'lucide-react';

interface MigrationResult {
  formsProcessed: number;
  formsUpdated: number;
  totalFieldsProcessed: number;
  totalFieldsUpdated: number;
  totalFieldsWithStableIds: number;
  dryRun: boolean;
  results: Array<{
    formId: string;
    formName?: string;
    fieldsProcessed: number;
    fieldsUpdated: number;
    fieldsWithStableIds: number;
    success: boolean;
    error?: string;
  }>;
}

export default function MigrateStableIdsButton() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [formId, setFormId] = useState('');
  const [result, setResult] = useState<MigrationResult | null>(null);

  const runMigration = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/migrate-stable-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: formId || undefined,
          dryRun,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to migrate forms');
      }
      
      const data = await response.json();
      setResult(data);
      
      toast({
        title: dryRun ? 'Dry run completed' : 'Migration completed',
        description: `Processed ${data.formsProcessed} forms, updated ${data.formsUpdated} forms with ${data.totalFieldsUpdated} fields`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error migrating forms:', error);
      toast({
        title: 'Migration failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Database className="h-4 w-4" />
        Migrate to Stable IDs
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Migrate Forms to Stable IDs</DialogTitle>
            <DialogDescription>
              This utility will add stable IDs to form fields, making email rules more reliable.
              Stable IDs ensure that email rules continue to work even when forms are modified or recreated.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="dry-run" 
                checked={dryRun} 
                onCheckedChange={(checked) => setDryRun(checked as boolean)} 
              />
              <Label htmlFor="dry-run">
                Dry run (preview changes without saving)
              </Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="form-id">
                Form ID (optional - leave empty to migrate all forms)
              </Label>
              <Input
                id="form-id"
                placeholder="form2_123456"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
              />
            </div>
            
            {result && (
              <div className="border rounded-md p-4 bg-muted/50 space-y-2 max-h-[300px] overflow-y-auto">
                <h3 className="font-medium">Migration Results</h3>
                <p>
                  <strong>Forms processed:</strong> {result.formsProcessed}<br />
                  <strong>Forms updated:</strong> {result.formsUpdated}<br />
                  <strong>Fields processed:</strong> {result.totalFieldsProcessed}<br />
                  <strong>Fields updated:</strong> {result.totalFieldsUpdated}<br />
                  <strong>Fields with stable IDs:</strong> {result.totalFieldsWithStableIds}<br />
                  <strong>Dry run:</strong> {result.dryRun ? 'Yes' : 'No'}
                </p>
                
                {result.results.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Form Details</h4>
                    <div className="space-y-2">
                      {result.results.map((formResult, index) => (
                        <div key={index} className="border rounded p-2 text-sm">
                          <p>
                            <strong>{formResult.formName || formResult.formId}</strong><br />
                            {formResult.success ? (
                              <>
                                Fields: {formResult.fieldsProcessed} processed, {formResult.fieldsUpdated} updated<br />
                                {formResult.fieldsUpdated === 0 && 'No changes needed'}
                              </>
                            ) : (
                              <span className="text-destructive">{formResult.error}</span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={runMigration} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dryRun ? 'Run Dry Migration' : 'Migrate Forms'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}