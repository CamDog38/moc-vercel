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
  createEmailRule,
  deleteEmailRule,
  parseConditions,
  cleanDescription
} from './emailRuleService';

interface EmailRuleFormProps {
  ruleId?: string; // Optional - if provided, we're editing; if not, we're creating
  isNew?: boolean;
}

export function EmailRuleForm({ ruleId, isNew = false }: EmailRuleFormProps) {
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
  const [conditions, setConditions] = useState<Condition[]>([
    { id: '1', field: '', operator: 'equals', value: '' }
  ]);
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load data when component mounts
  useEffect(() => {
    loadInitialData();
  }, [ruleId]);

  // Fetch form fields when form is selected
  useEffect(() => {
    if (formId) {
      console.log('Form ID changed, loading fields:', { formId });
      loadFormFields(formId);
    } else {
      setFormFields([]);
    }
  }, [formId]);

  const loadInitialData = async () => {
    try {
      setFetchLoading(true);
      await Promise.all([
        loadTemplates(),
        loadForms()
      ]);
      
      // If editing an existing rule, load it
      if (ruleId && !isNew) {
        await loadRule();
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setFetchLoading(false);
    }
  };

  const loadRule = async () => {
    if (!ruleId) return;
    
    try {
      const data = await fetchEmailRule(ruleId);
      if (!data) {
        throw new Error('Rule not found');
      }
      
      setRule(data);
      setName(data.name);
      
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
      
      if (data.recipientType === 'custom') {
        setRecipientEmail(data.recipientEmail || '');
      }
      
      if (data.recipientType === 'field') {
        setRecipientField(data.recipientField || '');
      }
      
      // Parse conditions
      if (data.conditions) {
        const parsedConditions = parseConditions(data.conditions);
        console.log('Parsed conditions:', parsedConditions);
        if (parsedConditions.length > 0) {
          setConditions(parsedConditions);
        }
      }
    } catch (error) {
      console.error('Error loading rule:', error);
      setError('Failed to load rule. Please try again.');
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

  const loadForms = async () => {
    try {
      const data = await fetchForms2();
      setForms(data);
    } catch (error) {
      console.error('Error fetching forms:', error);
      setError('Failed to load forms');
    }
  };

  const loadFormFields = async (id: string) => {
    try {
      const data = await fetchFormFields(id, true); // Always use Form System 2.0
      setFormFields(data);
    } catch (error) {
      console.error('Error fetching form fields:', error);
      setError('Failed to load form fields');
    }
  };

  const handleAddCondition = () => {
    setConditions([...conditions, { id: Date.now().toString(), field: '', operator: 'equals', value: '' }]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions(conditions.filter(condition => condition.id !== id));
  };

  const handleConditionChange = (id: string, field: string, value: string) => {
    setConditions(conditions.map(condition => {
      if (condition.id !== id) return condition;
      
      const updatedCondition = { ...condition, [field]: value };
      
      // If the field is changed, we need to update the field type and options
      if (field === 'field') {
        const selectedField = formFields.find(f => (f.key || f.id) === value);
        if (selectedField) {
          // Store multiple identifiers for resilience
          updatedCondition.fieldId = selectedField.id;
          updatedCondition.fieldStableId = selectedField.stableId || '';
          updatedCondition.fieldLabel = selectedField.label || '';
          updatedCondition.fieldType = selectedField.type;
          
          console.log('Field selected with multiple identifiers:', {
            id: selectedField.id,
            stableId: selectedField.stableId,
            label: selectedField.label
          });
          
          // For select fields, provide options
          if (selectedField.type === 'select' && selectedField.options) {
            updatedCondition.fieldOptions = selectedField.options;
            updatedCondition.originalOptions = selectedField.originalOptions;
          } else {
            delete updatedCondition.fieldOptions;
            delete updatedCondition.originalOptions;
          }
          
          // Reset value when field changes
          updatedCondition.value = '';
        }
      }
      
      return updatedCondition;
    }));
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
      
      // Format conditions for API with multiple identifiers for resilience
      const conditionsToSend = JSON.stringify(conditions.map(({ 
        id, 
        field, 
        operator, 
        value,
        fieldId,
        fieldStableId,
        fieldLabel 
      }) => ({
        id,
        field,
        operator,
        value,
        fieldId: fieldId || field,
        fieldStableId: fieldStableId || '',
        fieldLabel: fieldLabel || ''
      })));
      
      const ruleData = {
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
      };
      
      if (ruleId && !isNew) {
        // Update existing rule
        await updateEmailRule(ruleId, ruleData);
      } else {
        // Create new rule
        await createEmailRule(ruleData);
      }
      
      router.push('/dashboard/emails?tab=rules');
    } catch (error) {
      console.error('Error saving rule:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!ruleId) return;
    
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
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!isNew && !rule && !fetchLoading && ruleId) {
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
          <h1 className="text-2xl font-bold">{isNew ? 'Create Email Rule' : 'Edit Email Rule'}</h1>
        </div>
        
        {!isNew && ruleId && (
          <DeleteRuleDialog 
            onDelete={handleDelete}
            isDeleting={deleteLoading}
          />
        )}
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
            useFormSystem2={true} // Always true
            setUseFormSystem2={() => {}} // No-op function since we're removing the toggle
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
