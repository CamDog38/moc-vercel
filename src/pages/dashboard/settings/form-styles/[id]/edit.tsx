import { useRouter } from 'next/router';
import { FormStyleEditor } from '@/components/FormStyleEditor';

export default function EditFormStylePage() {
  const router = useRouter();
  const { id } = router.query;

  const handleSave = () => {
    router.push('/dashboard/settings/form-styles');
  };

  return (
    <div className="container mx-auto py-10">
      {id && typeof id === 'string' && (
        <FormStyleEditor styleId={id} onSave={handleSave} />
      )}
    </div>
  );
}