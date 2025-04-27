import { useRouter } from 'next/router';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { 
  Home, 
  Settings, 
  FileText, 
  Mail, 
  ListFilter,
  Activity,
  Users,
  Calendar,
  FileCheck,
  AlertCircle,
  BarChart
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = router.pathname;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <div className="flex-1">
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
