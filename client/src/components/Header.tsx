import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import StatusIndicator from "./StatusIndicator";
import { User } from "@shared/schema";
import logoImage from "@assets/logo_1757730069515.png";

type StatusType = "studying" | "free" | "in_class" | "busy" | "tired" | "social";

interface HeaderProps {
  user: User | null;
  userStatus?: StatusType;
  onLogin?: () => void;
  onLogout?: () => void;
}

export default function Header({ user, userStatus = "free", onLogin, onLogout }: HeaderProps) {

  const userInitials = user?.username
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="SlotSync Logo" className="h-7 w-7 sm:h-8 sm:w-8" />
            <h1 className="text-base sm:text-lg font-semibold">SlotSync</h1>
          </div>

          {/* User section */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
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
                      <p className="text-sm font-medium">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.major}</p>
                    </div>
                  </div>
                </Link>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onLogout}
                  data-testid="logout-button"
                  className="text-xs sm:text-sm px-2 sm:px-3 min-h-[36px] sm:min-h-[32px]"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">Out</span>
                </Button>
              </div>
            ) : (
              <Button 
                onClick={onLogin} 
                data-testid="login-button"
                size="sm"
                className="text-xs sm:text-sm px-3 sm:px-4 min-h-[36px] sm:min-h-[32px]"
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}