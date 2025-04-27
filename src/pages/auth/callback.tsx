import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@/util/supabase/component'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()
  const { createUser } = useAuth()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('User authenticated, creating user profile...');
          }
          await createUser(session.user)
          
          // Fetch user role to determine redirect
          try {
            const response = await fetch('/api/auth/user-role', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            });
            
            if (response.ok) {
              const data = await response.json();
              // Redirect based on role
              if (data.role === 'MARRIAGE_OFFICER') {
                router.push('/portal');
              } else {
                router.push('/dashboard');
              }
            } else {
              // Default redirect if role fetch fails
              router.push('/dashboard');
            }
          } catch (roleError) {
            console.error('Error fetching user role:', roleError);
            // Default redirect if role fetch fails
            router.push('/dashboard');
          }
        } else {
          console.error('No session found during callback')
          router.push('/login?error=No session found')
        }
      } catch (error) {
        console.error('Error during auth callback:', error)
        router.push('/error?message=Authentication failed')
      }
    }

    handleCallback()
  }, [router, createUser, supabase.auth])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Completing authentication...</h2>
        <p>Please wait while we redirect you.</p>
      </div>
    </div>
  )
}