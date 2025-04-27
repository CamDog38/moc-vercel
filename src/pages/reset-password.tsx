import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { AuthContext } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { createClient } from '@/util/supabase/component';
import { useToast } from "@/components/ui/use-toast";
import { debug, error as logError } from '@/util/logger';

const ResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionVerified, setSessionVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { toast } = useToast();
  
  // Extract hash fragment from URL for password reset
  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        setIsLoading(true);
        
        // Get the full URL including hash fragment
        const hash = window.location.hash;
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');
        const code = searchParams.get('code');
        
        debug('Reset password params:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          type,
          hasCode: !!code,
          hasHash: !!hash,
          url: window.location.href.replace(/access_token=([^&]+)/, 'access_token=REDACTED')
                                   .replace(/refresh_token=([^&]+)/, 'refresh_token=REDACTED')
                                   .replace(/code=([^&]+)/, 'code=REDACTED')
        }, 'auth');
        
        let sessionSet = false;
        
        // First try: If we have a code parameter, exchange it for a session
        if (code && !sessionSet) {
          debug('Attempting to exchange code for session', 'auth');
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (error) {
              logError('Error exchanging code for session:', 'auth', error);
            } else if (data?.session) {
              debug('Successfully exchanged code for session', 'auth');
              sessionSet = true;
            }
          } catch (err) {
            logError('Exception exchanging code for session:', 'auth', err);
          }
        }
        
        // Second try: If we have tokens in the URL query params, set the session
        if (accessToken && refreshToken && !sessionSet) {
          debug('Setting session from query params', 'auth');
          try {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) {
              logError('Error setting session from query params:', 'auth', error);
            } else {
              sessionSet = true;
              debug('Successfully set session from query params', 'auth');
            }
          } catch (err) {
            logError('Exception setting session from query params:', 'auth', err);
          }
        } 
        
        // Third try: If session not set yet and we have a hash, try to extract tokens from hash
        if (!sessionSet && hash) {
          debug('Attempting to extract tokens from hash fragment', 'auth');
          try {
            // Handle hash fragment (older Supabase versions)
            // Extract tokens from hash
            const hashParams = new URLSearchParams(hash.substring(1));
            const hashAccessToken = hashParams.get('access_token');
            const hashRefreshToken = hashParams.get('refresh_token');
            const hashType = hashParams.get('type');
            
            debug('Hash params:', { 
              hasAccessToken: !!hashAccessToken, 
              hasRefreshToken: !!hashRefreshToken, 
              type: hashType 
            }, 'auth');
            
            if (hashAccessToken && hashRefreshToken) {
              debug('Setting session from hash params', 'auth');
              const { error } = await supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken
              });
              
              if (error) {
                logError('Error setting session from hash params:', 'auth', error);
              } else {
                sessionSet = true;
                debug('Successfully set session from hash params', 'auth');
              }
            }
          } catch (err) {
            logError('Exception processing hash params:', 'auth', err);
          }
        }
        
        // Fourth try: Check if we already have a valid session
        if (!sessionSet) {
          debug('No tokens found in URL, checking for existing session', 'auth');
        }
        
        // Verify we have a valid session
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          logError('Session verification error:', 'auth', sessionError);
          throw new Error('Unable to verify your session. Please request a new password reset link.');
        }
        
        if (!data.session) {
          logError('No session found after verification', 'auth');
          throw new Error('Your password reset link is invalid or has expired. Please request a new password reset link.');
        }
        
        // Check if this is a recovery session
        const isRecoverySession = 
          (type === 'recovery') || 
          (hash && hash.includes('type=recovery')) ||
          (data.session?.user?.email_confirmed_at !== data.session?.user?.last_sign_in_at);
        
        if (!isRecoverySession) {
          logError('Not a recovery flow:', 'auth', { type, hash, session: data.session });
          throw new Error('Invalid password reset link. Please request a new password reset link.');
        }
        
        debug('Session verified successfully for password reset', 'auth');
        setSessionVerified(true);
      } catch (err: any) {
        logError('Error setting up password reset:', 'auth', err);
        setError(err.message || 'Failed to initialize password reset');
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message || 'Failed to initialize password reset',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    handlePasswordReset();
  }, []);

  const validationSchema = Yup.object().shape({
    password: Yup.string()
      .required("Required")
      .min(8, "Must be at least 8 characters")
      .matches(/[a-zA-Z]/, "Must contain at least one letter")
      .matches(/[0-9]/, "Must contain at least one number"),
    confirmPassword: Yup.string()
      .required("Required")
      .oneOf([Yup.ref('password')], "Passwords must match"),
  });

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!sessionVerified) {
        toast({
          variant: "destructive",
          title: "Session Error",
          description: "Your password reset session is invalid. Please request a new password reset link.",
        });
        return;
      }
      
      setIsLoading(true);
      try {
        debug('Submitting password reset form', 'auth');
        
        // First verify we have a valid session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          logError('Session verification error during password update:', 'auth', sessionError);
          throw new Error('Your password reset session has expired. Please request a new password reset link.');
        }
        
        if (!sessionData.session) {
          logError('No session found during password update', 'auth');
          throw new Error('Your password reset session has expired. Please request a new password reset link.');
        }
        
        debug('Session verified, updating password', 'auth');
        
        // Update the user's password
        const { data, error } = await supabase.auth.updateUser({ 
          password: values.password 
        });
        
        if (error) {
          logError('Error updating password:', 'auth', error);
          throw error;
        }

        debug('Password updated successfully', 'auth');
        toast({
          title: "Success",
          description: "Your password has been reset successfully.",
        });

        // Redirect to login page instead of trying to sign in automatically
        // This is more reliable than trying to sign in with the new password
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } catch (error: any) {
        logError('Error resetting password:', 'auth', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to reset password. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="flex h-screen bg-neutral-900 justify-center items-center">
      <div className="flex flex-col gap-7 h-[600px]">
        <div className="w-full flex justify-center cursor-pointer" onClick={() => router.push("/")}>
          <Logo />
        </div>

        <div className="w-full md:w-[440px] p-0 md:p-12 rounded-lg bg-transparent md:bg-neutral-800 border-0 md:border border-neutral-700">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
              <p className="text-neutral-300">Verifying your session...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col gap-6 py-8">
              <h2 className="font-medium text-2xl text-neutral-100 text-center">
                Reset Password Error
              </h2>
              <div className="bg-red-900/30 border border-red-800 rounded-md p-4 mb-4">
                <p className="text-red-300 text-center">{error}</p>
              </div>
              <button
                type="button"
                className="w-full py-2 text-sm font-medium text-neutral-100 bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none"
                onClick={() => router.push('/forgot-password')}
              >
                Request New Reset Link
              </button>
              <div className="flex justify-center">
                <span
                  className="text-primary-400 text-sm font-medium cursor-pointer hover:underline"
                  onClick={() => router.push('/login')}
                >
                  Back to Login
                </span>
              </div>
            </div>
          ) : !sessionVerified ? (
            <div className="flex flex-col gap-6 py-8">
              <h2 className="font-medium text-2xl text-neutral-100 text-center">
                Invalid Reset Link
              </h2>
              <div className="bg-amber-900/30 border border-amber-800 rounded-md p-4 mb-4">
                <p className="text-amber-300 text-center">
                  Your password reset link appears to be invalid or has expired. Please request a new password reset link.
                </p>
              </div>
              <button
                type="button"
                className="w-full py-2 text-sm font-medium text-neutral-100 bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none"
                onClick={() => router.push('/forgot-password')}
              >
                Request New Reset Link
              </button>
              <div className="flex justify-center">
                <span
                  className="text-primary-400 text-sm font-medium cursor-pointer hover:underline"
                  onClick={() => router.push('/login')}
                >
                  Back to Login
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={formik.handleSubmit} className="flex flex-col gap-6">
              <h2 className="font-medium text-2xl text-neutral-100 text-center">
                Reset Password
              </h2>

              <p className="text-sm text-neutral-300 text-center">
                Enter your new password below.
              </p>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <label htmlFor="password" className="text-sm text-neutral-300">New Password</label>
                    {formik.touched.password && formik.errors.password && (
                      <span className="text-red-500 text-xs">{formik.errors.password}</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      className="w-full p-2.5 text-sm text-neutral-100 bg-neutral-700 border border-neutral-600 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter your new password"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEye className="text-neutral-400" /> : <FaEyeSlash className="text-neutral-400" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <label htmlFor="confirmPassword" className="text-sm text-neutral-300">Confirm New Password</label>
                    {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                      <span className="text-red-500 text-xs">{formik.errors.confirmPassword}</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      className="w-full p-2.5 text-sm text-neutral-100 bg-neutral-700 border border-neutral-600 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Confirm your new password"
                      value={formik.values.confirmPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <FaEye className="text-neutral-400" /> : <FaEyeSlash className="text-neutral-400" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-2 text-sm font-medium text-neutral-100 bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition duration-200 ${
                  isLoading || !formik.isValid ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isLoading || !formik.isValid}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>

              <div className="flex justify-center">
                <span
                  className="text-primary-400 text-sm font-medium cursor-pointer hover:underline"
                  onClick={() => router.push('/login')}
                >
                  Back to Login
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;