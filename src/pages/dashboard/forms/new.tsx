import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { FormBuilder } from "@/components/FormBuilder";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormField, FormSection } from "@/components/FormBuilder";

export type FormType = "INQUIRY" | "BOOKING";

export default function NewForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "INQUIRY" as FormType,
    fields: [] as FormField[],
    sections: [] as FormSection[],
    isMultiPage: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create form");
      }

      const data = await response.json();

      toast({
        title: "Success",
        description: "Form created successfully",
      });

      router.push("/dashboard/forms");
    } catch (error) {
      console.error("Form creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create form",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="container mx-auto p-8">
          <Card>
            <CardHeader>
              <CardTitle>Create New Form</CardTitle>
              <CardDescription>
                Design your form by adding and configuring fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium" htmlFor="name">
                      Form Name
                    </label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium" htmlFor="type">
                      Form Type
                    </label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: FormType) =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select form type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INQUIRY">Inquiry Form</SelectItem>
                        <SelectItem value="BOOKING">Booking Form</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium" htmlFor="description">
                      Description
                    </label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>
                  <FormBuilder
                    fields={formData.fields}
                    sections={formData.sections}
                    isMultiPage={formData.isMultiPage}
                    onChange={({ fields, sections, isMultiPage }) => 
                      setFormData({ 
                        ...formData, 
                        fields: fields || [], 
                        sections: sections || [], 
                        isMultiPage: isMultiPage || false 
                      })
                    }
                    formType={formData.type}
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Form"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}