import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import StatusIndicator from "./StatusIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { PublicUser, PendingFriendRequest } from "@shared/schema";
import { Bell } from "lucide-react";
import logoImage from "@assets/logo_1757730069515.png";

type StatusType = "studying" | "free" | "in_class" | "busy" | "tired" | "social";

interface HeaderProps {
  userStatus?: StatusType;
}

export default function Header({ userStatus = "free" }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch pending friend requests for notification count
  const { data: pendingRequests } = useQuery<PendingFriendRequest[]>({
    queryKey: ['/api/friends/requests'],
    enabled: isAuthenticated && !!user,
  });

  const pendingCount = pendingRequests?.length || 0;

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
                
                {/* Notifications */}
                <Link href="/notifications" data-testid="link-notifications">
                  <div className="relative hover-elevate rounded-lg p-2 -m-2 cursor-pointer">
                    <Bell className="h-5 w-5 text-white" />
                    {pendingCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs font-semibold min-w-[20px]"
                      >
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </Badge>
                    )}
                  </div>
                </Link>
                
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
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}