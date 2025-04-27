/**
 * Form Style Tab Component
 * 
 * This component displays the form style editor.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FormStyleEditor } from '@/components/forms2/ui/FormStyleEditor';
import { useFormDetail } from './FormDetailContext';
import { useRouter } from 'next/router';

export default function FormStyleTab() {
  const router = useRouter();
  const { form, loading } = useFormDetail();
  const { id } = router.query;

  return (
    <Card>
      <CardContent className="p-6">
        {form && !loading ? (
          <FormStyleEditor formId={id as string} formName={form.name} />
        ) : (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
