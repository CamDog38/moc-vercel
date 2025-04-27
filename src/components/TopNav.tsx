import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Receipt,
  Settings,
  BarChart,
  Calendar,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function TopNav() {
  const router = useRouter();
  const { signOut } = useAuth();

  // Check if we're in a dashboard page that might have its own layout
  const isDashboardWithLayout = router.pathname.startsWith('/dashboard/') && 
                               (router.pathname.includes('/forms/[id]/view') || 
                                router.pathname.includes('/forms/[id]/edit') ||
                                router.pathname.includes('/pdf-templates/'));

  // Only show navigation for dashboard routes and not for pages with their own layout
  const isPortalRoute = router.pathname.startsWith('/portal');
  const isDebugPage = router.pathname.startsWith('/debug/');
  const shouldShowNav = !isPortalRoute && (!isDashboardWithLayout || isDebugPage);

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Leads",
      href: "/dashboard/leads",
      icon: Users,
    },
    {
      name: "Bookings",
      href: "/dashboard/bookings",
      icon: Calendar,
    },
    {
      name: "Invoices",
      href: "/dashboard/invoices",
      icon: Receipt,
    },
    {
      name: "Payments",
      href: "/dashboard/payments",
      icon: CreditCard,
    },
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: BarChart,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];
  
  // Debug navigation for development and troubleshooting
  const debugNavigation = [
    {
      name: "API Logs",
      href: "/debug/api-logs",
      icon: LayoutDashboard,
    },
    {
      name: "firstName Debug",
      href: "/debug/firstName-extraction",
      icon: Users,
    },
  ];

  // Add a class to the nav element to identify it
  return (
    <div className="border-b main-top-nav">
      <div className="flex h-16 items-center px-4">
        {shouldShowNav && (
          <div className="flex items-center space-x-4">
            {navigation.map((item) => (
              <Button
                key={item.href}
                variant={router.pathname === item.href ? "secondary" : "ghost"}
                className={cn(
                  "flex items-center",
                  router.pathname === item.href
                    ? "bg-accent"
                    : "hover:bg-accent"
                )}
                onClick={() => router.push(item.href)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Button>
            ))}
          </div>
        )}
        
        {/* Debug navigation */}
        {isDebugPage && (
          <div className="flex items-center space-x-4 ml-8">
            <div className="text-sm font-medium text-muted-foreground">Debug:</div>
            {debugNavigation.map((item) => (
              <Button
                key={item.href}
                variant={router.pathname === item.href ? "secondary" : "ghost"}
                className={cn(
                  "flex items-center",
                  router.pathname === item.href
                    ? "bg-accent"
                    : "hover:bg-accent"
                )}
                onClick={() => router.push(item.href)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Button>
            ))}
          </div>
        )}
        
        <div className="ml-auto">
          <Button
            variant="ghost"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}