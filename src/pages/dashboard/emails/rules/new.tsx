import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import { EmailRuleForm } from '@/components/emails/rules/EmailRuleForm';

export default function NewEmailRulePage() {
  const router = useRouter();
  
  return (
    <DashboardLayout>
      <div className="container mx-auto p-8">
        <EmailRuleForm isNew={true} />
      </div>
    </DashboardLayout>
  );
}
