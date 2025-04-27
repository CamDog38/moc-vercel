import { useRouter } from 'next/router';
import { FormStyleEditor } from '@/components/FormStyleEditor';

export default function NewFormStylePage() {
  const router = useRouter();

  const handleSave = () => {
    router.push('/dashboard/settings/form-styles');
  };

  return (
    <div className="container mx-auto py-10">
      <FormStyleEditor onSave={handleSave} />
    </div>
  );
}