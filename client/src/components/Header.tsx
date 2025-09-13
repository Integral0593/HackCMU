import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusIndicator from "./StatusIndicator";
import { User } from "@shared/schema";
import { GraduationCap, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

type StatusType = "studying" | "free" | "help" | "busy" | "tired" | "social";

interface HeaderProps {
  user: User | null;
  userStatus?: StatusType;
  onLogin?: () => void;
  onLogout?: () => void;
}

export default function Header({ user, userStatus = "free", onLogin, onLogout }: HeaderProps) {
  const [isDark, setIsDark] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  const userInitials = user?.username
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">Campus Connect</h1>
          </div>

          {/* User section */}
          <div className="flex items-center gap-4">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="theme-toggle"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {user ? (
              <div className="flex items-center gap-3">
                {/* User status */}
                <StatusIndicator status={userStatus} size="sm" />
                
                {/* User info */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {user.avatar && <AvatarImage src={user.avatar} alt={user.username} />}
                    <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                  
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.major}</p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onLogout}
                  data-testid="logout-button"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Button onClick={onLogin} data-testid="login-button">
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}