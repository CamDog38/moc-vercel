import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RuleDetailsCard } from './RuleDetailsCard';
import { ConditionsCard } from './ConditionsCard';
import { DeleteRuleDialog } from './DeleteRuleDialog';
import { EmailRule, Condition, FormField, Form, EmailTemplate } from './types';
import {
  fetchEmailRule,
  fetchEmailTemplates,
  fetchForms2,
  fetchFormFields,
  updateEmailRule,
  deleteEmailRule,
  parseConditions,
  detectFormSystem2,
  cleanDescription
} from './emailRuleService';

interface EditEmailRuleFormProps {
  ruleId: string;
}

export function EditEmailRuleForm({ ruleId }: EditEmailRuleFormProps) {
  const router = useRouter();
  
  const [rule, setRule] = useState<EmailRule | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [formId, setFormId] = useState('');
  const [active, setActive] = useState(true);
  const [ccEmails, setCcEmails] = useState('');
  const [bccEmails, setBccEmails] = useState('');
  const [recipientType, setRecipientType] = useState('form');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientField, setRecipientField] = useState('');
  const [conditions, setConditions] = useState<Condition[]>([]);
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  // Legacy forms removed
  const [forms2, setForms2] = useState<Form[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [useFormSystem2, setUseFormSystem2] = useState(false);

  const forms = forms2; // Always use Form System 2.0

  // Load rule data when component mounts or ruleId changes
  useEffect(() => {
    if (ruleId) {
      console.log('=== LOADING RULE DATA ===');
      console.log('Rule ID:', ruleId);
      loadInitialData();
    }
  }, [ruleId]);

  // Fetch form fields when form is selected or form system changes
  useEffect(() => {
    if (formId) {
      console.log('Form ID or Form System changed, loading fields:', { formId, useFormSystem2 });
      loadFormFields(formId);
    } else {
      setFormFields([]);
    }
  }, [formId]);

  const loadInitialData = async () => {
    try {
      setFetchLoading(true);
      await Promise.all([
        loadRule(),
        loadTemplates(),
        loadForms2()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setFetchLoading(false);
    }
  };

  const loadRule = async () => {
    try {
      const data = await fetchEmailRule(ruleId);
      if (!data) {
        throw new Error('Rule not found');
      }
      
      setRule(data);
      setName(data.name);
      
      // Handle form system detection and description cleaning
      const isForm2 = detectFormSystem2(data);
      console.log('Form System 2.0 detected:', isForm2);
      setUseFormSystem2(isForm2);
      
      if (data.description) {
        const cleanedDescription = cleanDescription(data.description);
        setDescription(cleanedDescription);
      } else {
        setDescription('');
      }
      
      setTemplateId(data.templateId);
      setFormId(data.formId || '');
      setActive(data.active);
      setCcEmails(data.ccEmails || '');
      setBccEmails(data.bccEmails || '');
      setRecipientType(data.recipientType || 'form');
      setRecipientEmail(data.recipientEmail || '');
      setRecipientField(data.recipientField || '');
      
      // Parse conditions
      const parsedConditions = parseConditions(data.conditions);
      console.log('Parsed conditions:', parsedConditions);
      setConditions(parsedConditions);
    } catch (error) {
      console.error('Error fetching rule:', error);
      setError('Failed to load rule');
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await fetchEmailTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to load email templates');
    }
  };

  // Legacy forms function removed

  const loadForms2 = async () => {
    try {
      const data = await fetchForms2();
      setForms2(data);
    } catch (error) {
      console.error('Error fetching Form System 2.0 forms:', error);
      setError('Failed to load Form System 2.0 forms');
    }
  };

  const loadFormFields = async (id: string) => {
    try {
      console.log('============= LOADING FORM FIELDS =============');
      console.log(`Form ID: ${id}, useFormSystem2: ${useFormSystem2}`);
      
      // Log current conditions before updating
      console.log('Current conditions before field update:', JSON.stringify(conditions, null, 2));
      
      const fields = await fetchFormFields(id, useFormSystem2);
      console.log('Received fields from API:', JSON.stringify(fields, null, 2));
      setFormFields(fields);

      // Log field details for debugging
      fields.forEach((field) => {
        console.log(`Field ${field.id} (${field.label}):`, {
          type: field.type,
          hasOptions: field.options && field.options.length > 0,
          optionsCount: field.options ? field.options.length : 0,
          hasOriginalOptions: field.originalOptions && field.originalOptions.length > 0,
          originalOptionsCount: field.originalOptions ? field.originalOptions.length : 0
        });
        
        if (field.options && field.options.length > 0) {
          console.log(`Field ${field.id} (${field.label}) options:`, JSON.stringify(field.options, null, 2));
        }
        if (field.originalOptions && field.originalOptions.length > 0) {
          console.log(`Field ${field.id} (${field.label}) originalOptions:`, JSON.stringify(field.originalOptions, null, 2));
        }
      });

      // Update field types and options for existing conditions
      const updatedConditions = conditions.map(condition => {
        console.log(`Processing condition for field: ${condition.field}`);
        const matchingField = fields.find(f => (f.key || f.id) === condition.field);
        
        if (matchingField) {
          console.log(`Found matching field for condition ${condition.field}:`, JSON.stringify(matchingField, null, 2));
          console.log(`Condition before update:`, JSON.stringify(condition, null, 2));
          
          const updatedCondition = {
            ...condition,
            fieldType: matchingField.type,
            fieldOptions: matchingField.options,
            originalOptions: matchingField.originalOptions // Add originalOptions for Form System 2.0
          };
          
          console.log(`Condition after update:`, JSON.stringify(updatedCondition, null, 2));
          return updatedCondition;
        } else {
          console.log(`No matching field found for condition with field ${condition.field}`);
          return condition;
        }
      });
      
      console.log('Setting updated conditions:', JSON.stringify(updatedConditions, null, 2));
      setConditions(updatedConditions);
      console.log('============= FINISHED LOADING FORM FIELDS =============');
    } catch (error) {
      console.error('Error fetching form fields:', error);
      setError('Failed to load form fields');
    }
  };

  const handleAddCondition = () => {
    const newId = (conditions.length + 1).toString();
    setConditions([...conditions, { id: newId, field: '', operator: 'equals', value: '' }]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions(conditions.filter(condition => condition.id !== id));
  };

  const handleConditionChange = (id: string, field: string, value: string) => {
    console.log('============= CONDITION CHANGE =============');
    console.log(`Changing condition ${id}, field: ${field}, value: ${value}`);
    
    if (field === 'field') {
      // When field changes, update the field type and options
      // First try to find by stableId, then by key or id
      const selectedField = formFields.find(f => (f.stableId === value)) || 
                           formFields.find(f => (f.key === value || f.id === value));

      console.log('Selected field for condition:', JSON.stringify(selectedField, null, 2));
      console.log('Is Form System 2.0 enabled:', useFormSystem2);
      
      if (selectedField) {
        console.log('Field options:', JSON.stringify(selectedField.options, null, 2));
        console.log('Field originalOptions:', JSON.stringify(selectedField.originalOptions, null, 2));
        console.log('Field stableId:', selectedField.stableId);
      }

      const updatedConditions = conditions.map(condition => {
        if (condition.id === id) {
          console.log('Updating condition:', JSON.stringify(condition, null, 2));
          
          const updatedCondition = {
            ...condition,
            [field]: value, // This is now the stableId from the dropdown
            fieldId: selectedField?.id, // Store the actual field ID
            fieldStableId: selectedField?.stableId || value, // Store the stable ID
            fieldLabel: selectedField?.label, // Store the field label for display
            fieldType: selectedField?.type,
            fieldOptions: selectedField?.options,
            originalOptions: selectedField?.originalOptions, // Add originalOptions for Form System 2.0
            // Reset value when field changes
            value: ''
          };
          
          console.log('Updated condition:', JSON.stringify(updatedCondition, null, 2));
          return updatedCondition;
        }
        return condition;
      });
      
      console.log('Setting updated conditions:', JSON.stringify(updatedConditions, null, 2));
      setConditions(updatedConditions);
    } else {
      const updatedConditions = conditions.map(condition => {
        if (condition.id === id) {
          const updatedCondition = { ...condition, [field]: value };
          console.log(`Updated condition ${field} to ${value}:`, JSON.stringify(updatedCondition, null, 2));
          return updatedCondition;
        }
        return condition;
      });
      
      setConditions(updatedConditions);
    }
    console.log('============= CONDITION CHANGE COMPLETE =============');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !templateId || !formId) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate conditions
      const validConditions = conditions.filter(c => c.field && c.operator && c.value);
      if (validConditions.length === 0) {
        setError('Please add at least one valid condition');
        return;
      }
      
      // Validate recipient information
      if (recipientType === 'custom' && !recipientEmail) {
        setError('Please enter a notification email address');
        return;
      }
      
      if (recipientType === 'field' && !recipientField) {
        setError('Please select a form field for the notification email');
        return;
      }
      
      // Prepare conditions with stable IDs for saving
      const conditionsToSend = validConditions.map((condition) => {
        // Use the fieldStableId from the condition if available, otherwise try to find it
        const stableId = condition.fieldStableId || condition.field;
        
        // Find the field in formFields to get additional information if needed
        const fieldInfo = formFields.find(f => f.stableId === stableId || f.id === condition.fieldId || f.key === condition.field);
        
        console.log('Preparing condition for saving:', {
          condition,
          stableId,
          fieldInfo
        });
        
        return {
          id: condition.id,
          // Use the stable ID as the primary field identifier
          field: stableId,
          // Store the original field ID for backward compatibility
          fieldId: condition.fieldId || fieldInfo?.id,
          // Store the field label for display purposes
          fieldLabel: condition.fieldLabel || fieldInfo?.label || '',
          operator: condition.operator,
          value: condition.value,
          // Include options for select/radio/checkbox fields if available
          fieldOptions: condition.fieldOptions || fieldInfo?.options,
          fieldType: condition.fieldType || fieldInfo?.type
        };
      });
      
      console.log('Saving conditions with stable IDs:', conditionsToSend);
      
      await updateEmailRule(ruleId, {
        name,
        description,
        templateId,
        formId,
        active,
        conditions: conditionsToSend,
        ccEmails,
        bccEmails,
        recipientType,
        recipientEmail: recipientType === 'custom' ? recipientEmail : undefined,
        recipientField: recipientType === 'field' ? recipientField : undefined,
        useFormSystem2: true, // Always use Form System 2.0
      });
      
      router.push('/dashboard/emails?tab=rules');
    } catch (error) {
      console.error('Error updating rule:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      await deleteEmailRule(ruleId);
      router.push('/dashboard/emails?tab=rules');
    } catch (error) {
      console.error('Error deleting rule:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while deleting the rule');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (fetchLoading) {
    return <div className="text-center py-12">Loading rule...</div>;
  }

  if (!rule && !fetchLoading) {
    return (
      <div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Rule not found</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/emails')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Email Management
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Edit Email Rule</h1>
        </div>
        
        <DeleteRuleDialog 
          onDelete={handleDelete}
          isDeleting={deleteLoading}
        />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RuleDetailsCard
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            templateId={templateId}
            setTemplateId={setTemplateId}
            formId={formId}
            setFormId={setFormId}
            active={active}
            setActive={setActive}
            ccEmails={ccEmails}
            setCcEmails={setCcEmails}
            bccEmails={bccEmails}
            setBccEmails={setBccEmails}
            recipientType={recipientType}
            setRecipientType={setRecipientType}
            recipientEmail={recipientEmail}
            setRecipientEmail={setRecipientEmail}
            recipientField={recipientField}
            setRecipientField={setRecipientField}
            useFormSystem2={useFormSystem2}
            setUseFormSystem2={setUseFormSystem2}
            templates={templates}
            forms={forms}
            formFields={formFields}
          />
          
          <ConditionsCard
            conditions={conditions}
            formFields={formFields}
            formId={formId}
            loading={loading}
            onAddCondition={handleAddCondition}
            onRemoveCondition={handleRemoveCondition}
            onConditionChange={handleConditionChange}
          />
        </div>
      </form>
    </div>
  );
}
