/**
 * ConditionsCard Component - Manages the conditional logic for email rules
 * 
 * This component provides the interface for defining when an email rule should trigger based on form data.
 * It allows users to create, edit, and remove conditions that determine when an email will be sent.
 * 
 * Features:
 * - Add/remove multiple conditions for complex rule matching
 * - Select form fields using stable IDs for reliable matching
 * - Choose operators (equals, contains, etc.) for flexible condition definition
 * - Specify values to match against for each condition
 * 
 * All conditions must be met for the email rule to trigger (AND logic).
 */

import { Condition, FormField } from './types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Save } from 'lucide-react';
import { ConditionItem } from './ConditionItem';

interface ConditionsCardProps {
  conditions: Condition[];
  formFields: FormField[];
  formId: string;
  loading: boolean;
  onAddCondition: () => void;
  onRemoveCondition: (id: string) => void;
  onConditionChange: (id: string, field: string, value: string) => void;
}

export function ConditionsCard({
  conditions,
  formFields,
  formId,
  loading,
  onAddCondition,
  onRemoveCondition,
  onConditionChange
}: ConditionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rule Conditions</CardTitle>
        <CardDescription>
          Define when this email should be sent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {conditions.length === 0 ? (
          <div className="text-center p-6 border border-dashed rounded-md">
            <p className="text-muted-foreground mb-4">No conditions defined yet</p>
            <Button
              type="button"
              variant="outline"
              onClick={onAddCondition}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Condition
            </Button>
          </div>
        ) : (
          <>
            {conditions.map((condition, index) => (
              <ConditionItem
                key={condition.id}
                condition={condition}
                index={index}
                formFields={formFields}
                formId={formId}
                onRemove={onRemoveCondition}
                onChange={onConditionChange}
                canRemove={conditions.length > 1}
              />
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={onAddCondition}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Condition
            </Button>
          </>
        )}
        
        <div className="text-sm text-muted-foreground mt-4">
          <p>
            <strong>How conditions work:</strong> All conditions must be met for the email to be sent.
          </p>
          {!formId && (
            <p className="mt-2 text-amber-600">
              <strong>Select a form</strong> to see available fields for conditions.
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t p-4">
        <Button
          type="submit"
          disabled={loading}
          className="ml-auto"
        >
          {loading ? 'Saving...' : 'Save Changes'}
          {!loading && <Save className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
}
