import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import StatusIndicator from "./StatusIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { PublicUser } from "@shared/schema";
import logoImage from "@assets/logo_1757730069515.png";

type StatusType = "studying" | "free" | "in_class" | "busy" | "tired" | "social";

interface HeaderProps {
  userStatus?: StatusType;
}

export default function Header({ userStatus = "free" }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  const userInitials = user?.username
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-red-600/95 backdrop-blur supports-[backdrop-filter]:bg-red-600/60 text-white border-red-700/50">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="SlotSync Logo" className="h-7 w-7 sm:h-8 sm:w-8" />
            <h1 className="text-base sm:text-lg font-semibold text-white">SlotSync</h1>
          </div>

          {/* User section */}
          <div className="flex items-center gap-2 sm:gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* User status */}
                <StatusIndicator status={userStatus} size="sm" />
                
                {/* User info */}
                <Link href="/profile" data-testid="link-profile">
                  <div className="flex items-center gap-2 hover-elevate rounded-lg p-1 -m-1 cursor-pointer">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                      {user.avatar && <AvatarImage src={user.avatar} alt={user.username} />}
                      <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                    </Avatar>
                    
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-white">{user.username}</p>
                      <p className="text-xs text-red-100">{user.major}</p>
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setLocation('/login')} 
                  data-testid="button-login"
                  size="sm"
                  variant="outline"
                  className="text-xs sm:text-sm px-2 sm:px-3 min-h-[36px] sm:min-h-[32px] border-red-300 text-white hover:bg-red-700 hover:border-red-400"
                >
                  Login
                </Button>
                <Button 
                  onClick={() => setLocation('/register')} 
                  data-testid="button-register"
                  size="sm"
                  className="text-xs sm:text-sm px-2 sm:px-3 min-h-[36px] sm:min-h-[32px] bg-red-700 hover:bg-red-800 text-white border-red-600"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}