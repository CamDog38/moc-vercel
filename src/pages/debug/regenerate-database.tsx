import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';

export default function RegenerateDatabase() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null;
  }

  const regenerateDatabase = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/regenerate-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate database');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Regenerate Database Tables</CardTitle>
          <CardDescription>
            This utility will recreate all database tables based on the Prisma schema.
            Use this if your database tables are missing or corrupted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {result && (
            <Alert variant={result.success ? "default" : "destructive"} className="mb-4">
              <AlertTitle>{result.success ? "Success" : "Failed"}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <p>
              This process will:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Apply all Prisma migrations to your database</li>
              <li>Recreate all tables defined in the schema</li>
              <li>Preserve any existing data if the tables already exist</li>
            </ul>
            <p className="text-amber-500 font-medium">
              Note: This operation is generally safe, but it's always a good idea to back up your data first if possible.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={regenerateDatabase} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating Database...
              </>
            ) : (
              'Regenerate Database Tables'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}