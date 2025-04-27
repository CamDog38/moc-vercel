/**
 * Forms Dashboard Redirect
 * 
 * This page redirects users from the legacy forms dashboard to the Forms 2.0 dashboard.
 * We've fully migrated to Forms 2.0 and no longer support the legacy forms system.
 */

import { useEffect } from "react";
import { useRouter } from "next/router";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FormsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Forms 2.0 dashboard
    router.push('/dashboard/forms2');
  }, [router]);

  return (
    <div className="container py-10 flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Redirecting to Forms 2.0</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="my-4">
            <Spinner size="lg" />
          </div>
          <p className="text-center text-muted-foreground">
            We've fully migrated to our new Forms 2.0 system.
            You'll be redirected automatically in a moment...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}