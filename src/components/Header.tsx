import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { Button } from "@/components/ui/button";

const Header = () => {
  const { user, initializing, signOut } = useAuth();
  const router = useRouter();
  
  // Check if we're on the portal page
  const isPortalPage = router.pathname.startsWith('/portal');

  const handleButtonClick = () => {
    if (user && router.pathname === '/dashboard') {
      signOut();
      router.push('/');
    } else {
      router.push(user ? "/dashboard" : "/login");
    }
  };

  const buttonText = () => {
    if (user && router.pathname === '/dashboard') {
      return "Log out";
    }
    return user ? "Dashboard" : "Login";
  };

  return (
    <header className="w-full">
      <div className="flex justify-between items-center py-4 px-4 sm:px-6 lg:px-8">
        <div className="cursor-pointer" onClick={() => router.push("/")}>
          <Logo />
        </div>
        {!initializing && !isPortalPage && (
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleButtonClick}
              variant="default"
              size="default"
            >
              {buttonText()}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;