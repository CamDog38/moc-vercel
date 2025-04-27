import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { FieldMappingVisualizer } from '@/components/FieldMappingVisualizer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ChevronLeft, Info, AlertTriangle, Check, X } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function FormFieldMappingsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [formName, setFormName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    if (!id) return;
    
    async function fetchFormDetails() {
      try {
        const response = await fetch(`/api/forms/${id}`);
        if (response.ok) {
          const data = await response.json();
          setFormName(data.name || 'Unnamed Form');
        }
      } catch (error) {
        console.error('Error fetching form details:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchFormDetails();
  }, [id]);
  
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard/forms">Forms</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/dashboard/forms/${id}/edit`}>{formName || '...'}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Field Mappings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <Button variant="outline" asChild>
            <Link href={`/dashboard/forms/${id}/edit`}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Form
            </Link>
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Stable Field ID System</CardTitle>
            <CardDescription>
              Understanding how form fields maintain stable identifiers for email rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>About Stable Field IDs</AlertTitle>
                <AlertDescription>
                  Each form field is assigned a unique, immutable stable ID when created. This ID persists even if you change the field's label, type, or position.
                </AlertDescription>
              </Alert>
              
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Benefits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Email rules remain functional even when form fields are renamed or reordered</li>
                      <li>Form updates won't break existing automations</li>
                      <li>Clear warnings when attempting to delete fields used in rules</li>
                      <li>Multiple ways to reference the same field (stable ID, mapping, label)</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="border-amber-200 dark:border-amber-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Important Considerations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Fields used in rules are marked with a warning badge</li>
                      <li>Deleting fields used in rules will trigger a confirmation dialog</li>
                      <li>When duplicating forms, new stable IDs are generated for all fields</li>
                      <li>Custom field mappings can be set for additional clarity</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-2">Field Identification Hierarchy</h3>
                <ol className="list-decimal pl-6 space-y-1">
                  <li><strong>Stable ID</strong> - Primary, immutable identifier (most reliable)</li>
                  <li><strong>Custom Mapping</strong> - Optional, user-defined identifier</li>
                  <li><strong>Field Label</strong> - Converted to camelCase as a fallback</li>
                  <li><strong>Field Type</strong> - For common fields like email and phone</li>
                </ol>
                <p className="mt-2 text-sm text-muted-foreground">
                  Email rules can reference fields using any of these identifiers, but the stable ID is the most reliable.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {id && typeof id === 'string' && (
          <FieldMappingVisualizer formId={id} />
        )}
      </div>
    </DashboardLayout>
  );
}