import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { AuthContext } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { debug, error as logError } from '@/util/logger';

const ForgotPasswordPage = () => {
  const router = useRouter();
  const { resetPassword } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { toast } = useToast();
  
  // Check if there's a stored cooldown timestamp
  useEffect(() => {
    const storedCooldownTime = localStorage.getItem('passwordResetCooldownUntil');
    if (storedCooldownTime) {
      const cooldownUntil = parseInt(storedCooldownTime, 10);
      const now = Date.now();
      
      if (cooldownUntil > now) {
        // Cooldown is still active
        const remainingSeconds = Math.ceil((cooldownUntil - now) / 1000);
        setCooldownActive(true);
        setCooldownSeconds(remainingSeconds);
        
        // Start the countdown timer
        const timer = setInterval(() => {
          setCooldownSeconds(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setCooldownActive(false);
              localStorage.removeItem('passwordResetCooldownUntil');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        return () => clearInterval(timer);
      } else {
        // Cooldown has expired
        localStorage.removeItem('passwordResetCooldownUntil');
      }
    }
  }, []);
  
  // Function to start cooldown timer
  const startCooldown = () => {
    const cooldownDuration = 35 * 1000; // 35 seconds (slightly more than Supabase's 30s limit)
    const cooldownUntil = Date.now() + cooldownDuration;
    
    localStorage.setItem('passwordResetCooldownUntil', cooldownUntil.toString());
    setCooldownActive(true);
    setCooldownSeconds(35);
    
    const timer = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCooldownActive(false);
          localStorage.removeItem('passwordResetCooldownUntil');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  };

  const validationSchema = Yup.object().shape({
    email: Yup.string().required("Email is required").email("Email is invalid"),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      // Check if cooldown is active
      if (cooldownActive) {
        toast({
          title: "Rate Limited",
          description: `Please wait ${cooldownSeconds} seconds before requesting another password reset.`,
          variant: "destructive",
        });
        return;
      }
      
      setIsLoading(true);
      try {
        debug(`Attempting to send password reset email to: ${values.email}`, 'auth');
        await resetPassword(values.email);
        
        // Start cooldown timer after successful request
        startCooldown();
        
        toast({
          title: "Success",
          description: 'Password reset email sent. Please check your inbox.',
          variant: "default",
        });
        // Optionally, you can redirect the user to a confirmation page
        // router.push('/reset-password-confirmation');
      } catch (error: any) {
        logError('Password reset error', 'auth', error);
        
        // Check if the error is a rate limit error
        if (error.message && error.message.includes('security purposes') && error.message.includes('30 seconds')) {
          // Start cooldown timer
          startCooldown();
          
          toast({
            title: "Rate Limited",
            description: 'For security purposes, you can only request a password reset every 30 seconds. Please try again shortly.',
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message || 'Failed to send reset email. Please try again.',
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="flex h-screen bg-background justify-center items-center">
      <div className="flex flex-col gap-5 h-auto">
        <div className="w-full flex justify-center cursor-pointer" onClick={() => router.push("/")}>
          <Logo />
        </div>

        <Card className="w-full md:w-[440px]">
          <CardHeader>
            <CardTitle className="text-center">Forgot Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={formik.handleSubmit}>
              <div className="flex flex-col gap-6">
                <p className="text-center text-sm text-muted-foreground">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.email && formik.errors.email && (
                    <p className="text-destructive text-xs">{formik.errors.email}</p>
                  )}
                </div>

                {cooldownActive ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      className="w-full"
                      disabled={true}
                    >
                      Wait {cooldownSeconds}s to request again
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      For security purposes, you can only request a password reset every 30 seconds.
                    </p>
                  </div>
                ) : (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !formik.values.email || !formik.isValid}
                  >
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                )}

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0"
                    onClick={() => router.push('/login')}
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;