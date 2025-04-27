import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import { EditEmailRuleForm } from '@/components/emails/rules/EditEmailRuleForm';

export default function EditEmailRulePage() {
  const router = useRouter();
  const { id } = router.query;
  
  return (
    <DashboardLayout>
      <div className="container mx-auto p-8">
        {id && typeof id === 'string' ? (
          <EditEmailRuleForm ruleId={id} />
        ) : (
          <div className="text-center py-12">Loading...</div>
        )}
      </div>
    </DashboardLayout>
  );
}
