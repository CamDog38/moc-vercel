import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { FormBuilder } from "@/components/FormBuilder";
import { FormActions } from "@/components/FormActions";
import type { FormField, FormSection } from "@/components/FormBuilder";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { TopNav } from "@/components/TopNav";
import FormSystem2Tab from "@/components/dashboard/forms/FormSystem2Tab";

export default function EditForm() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    fields: FormField[];
    sections: FormSection[];
    isMultiPage: boolean;
    type: 'INQUIRY' | 'BOOKING';
  }>({
    name: "",
    description: "",
    fields: [],
    sections: [],
    isMultiPage: false,
    type: 'INQUIRY',
  });

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchForm();
    }
  }, [id]);

  const fetchForm = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      const response = await fetch(`/api/forms/${id}`, { 
        credentials: 'include' // Ensure cookies are sent
      });
      if (!response.ok) {
        throw new Error("Failed to fetch form");
      }
      const data = await response.json();
      
      console.log('Received form data:', {
        id: data.id,
        name: data.name,
        formSections: data.formSections?.length,
        type: data.type
      });
      
      // Handle sections and multi-page configuration
      let sections: FormSection[] = [];
      let fields: FormField[] = [];
      let isMultiPage = data.isMultiPage || false;

      if (data.formSections && data.formSections.length > 0) {
        console.log('Processing form sections:', 
          data.formSections.map((s: any) => ({
            id: s.id,
            title: s.title,
            fieldsCount: s.fields?.length
          }))
        );
        
        sections = data.formSections.map((section: any) => ({
          id: section.id,
          title: section.title || '',
          description: section.description || '',
          isPage: section.isPage || false,
          fields: Array.isArray(section.fields) ? section.fields.map((field: any) => ({
            id: field.id || Math.random().toString(36).substr(2, 9),
            type: field.type || 'text',
            label: field.label || '',
            placeholder: field.placeholder || '',
            helpText: field.helpText || '',
            required: Boolean(field.required),
            options: Array.isArray(field.options) ? field.options : [],
            validation: field.validation || null,
            excludeTime: Boolean(field.excludeTime),
            mapping: field.mapping || null,
            conditionalLogic: field.conditionalLogic || null,
            stableId: field.stableId || null,
          })) : []
        }));
        
        console.log('Processed sections:', sections.map(s => ({
          id: s.id,
          title: s.title,
          fieldsCount: s.fields.length
        })));
      } else if (data.sections && Array.isArray(data.sections)) {
        // Legacy support
        if (process.env.NODE_ENV !== 'production') {
          console.log('Using legacy sections data');
        }
        sections = data.sections.map((section: any) => ({
          ...section,
          fields: Array.isArray(section.fields) ? section.fields.map((field: any) => ({
            id: field.id || Math.random().toString(36).substr(2, 9),
            type: field.type || 'text',
            label: field.label || '',
            required: Boolean(field.required),
            options: Array.isArray(field.options) ? field.options : [],
            mapping: field.mapping || null,
          })) : []
        }));
      } else if (Array.isArray(data.fields)) {
        // Legacy support or single-section form
        if (process.env.NODE_ENV !== 'production') {
          console.log('Using legacy fields data');
        }
        fields = data.fields.map((field: any) => ({
          id: field.id || Math.random().toString(36).substr(2, 9),
          type: field.type || 'text',
          label: field.label || '',
          placeholder: field.placeholder || '',
          required: Boolean(field.required),
          options: Array.isArray(field.options) ? field.options : [],
          mapping: field.mapping || null,
        }));
      }

      setFormData({
        name: data.name || '',
        description: data.description || '',
        fields,
        sections,
        isMultiPage,
        type: data.type || 'INQUIRY',
      });
    } catch (error) {
      console.error('Error fetching form:', error);
      toast({
        title: "Error",
        description: "Failed to load form. Please try again.",
        variant: "destructive",
      });
      router.push('/dashboard/forms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || typeof id !== 'string') return;

    setIsSaving(true);

    try {
      console.log('Saving form data:', {
        sections: formData.sections.length,
        fields: formData.fields.length,
        type: formData.type
      });

      // Prepare the form data payload
      const formPayload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sections: formData.sections.map((section: FormSection) => ({
          ...section,
          fields: section.fields.map((field: FormField) => ({
            ...field,
            options: field.options || null,
            validation: field.validation || null,
            excludeTime: field.excludeTime || false,
            mapping: field.mapping || null,
            conditionalLogic: field.conditionalLogic || null,
            stableId: field.stableId || null,
          }))
        })),
        isMultiPage: formData.isMultiPage,
        type: formData.type,
      };

      // Use the main endpoint for form updates
      const response = await fetch(`/api/forms/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(formPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to update form:", errorText);
        throw new Error("Failed to update form");
      }

      const result = await response.json();
      console.log('Form updated successfully:', result);

      toast({
        title: "Success",
        description: "Form updated successfully",
      });

      router.push('/dashboard/forms');
    } catch (error) {
      console.error('Error updating form:', error);
      toast({
        title: "Error",
        description: "Failed to update form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <TopNav />
        <div className="container mx-auto py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TopNav />
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit Form</h1>
          <Button variant="outline" onClick={() => router.push('/dashboard/forms')}>
            Back to Forms
          </Button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Form Details</CardTitle>
                    <CardDescription>Basic information about your form</CardDescription>
                  </div>
                  {typeof id === 'string' && <FormActions formId={id} />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium" htmlFor="name">Form Name</label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="description">Description</label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="type">Form Type</label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'INQUIRY' | 'BOOKING' })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="INQUIRY">Inquiry Form</option>
                    <option value="BOOKING">Booking Form</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="legacy" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="legacy">Legacy Builder</TabsTrigger>
                <TabsTrigger value="v2">Form System 2.0</TabsTrigger>
              </TabsList>
              
              <TabsContent value="legacy" className="mt-4">
                <FormBuilder
                  fields={formData.fields}
                  sections={formData.sections}
                  isMultiPage={formData.isMultiPage}
                  onChange={({ fields, sections, isMultiPage }) => 
                    setFormData({ ...formData, fields, sections: sections || [], isMultiPage: isMultiPage || false })
                  }
                  formType={formData.type}
                />
              </TabsContent>
              
              <TabsContent value="v2" className="mt-4">
                {typeof id === 'string' && (
                  <FormSystem2Tab
                    formId={id}
                    formName={formData.name}
                    formDescription={formData.description}
                    formType={formData.type}
                  />
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/forms')}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}