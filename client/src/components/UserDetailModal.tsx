import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import StatusIndicator from "./StatusIndicator";
import ChatInterface from "./ChatInterface";
import { User } from "@shared/schema";
import { User as UserIcon, GraduationCap, Home, MapPin, Users, MessageSquare } from "lucide-react";

type StatusType = "studying" | "free" | "in_class" | "busy" | "tired" | "social";

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentUserId: string;
  status?: StatusType;
  currentClass?: string;
  nextClass?: string;
}

export default function UserDetailModal({
  isOpen,
  onClose,
  user,
  currentUserId,
  status = "free",
  currentClass,
  nextClass
}: UserDetailModalProps) {
  const [showChat, setShowChat] = useState(false);
  
  if (!user) return null;

  const handleStartChat = () => {
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  const initials = user.username
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  const getGenderBadgeVariant = (gender: string | null) => {
    if (!gender || gender === "prefer_not_to_say") return "secondary";
    return "outline";
  };

  const formatGenderDisplay = (gender: string | null) => {
    if (!gender) return "Not specified";
    if (gender === "prefer_not_to_say") return "Prefer not to say";
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent 
        className="max-w-md mx-auto max-h-[90vh] overflow-y-auto"
        data-testid="user-detail-modal"
      >
        <DialogHeader className="pb-4">
          <DialogTitle className="text-center">User Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Avatar and Basic Info */}
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-20 w-20 border-2 border-border">
              {user.avatar && (
                <AvatarImage 
                  src={user.avatar} 
                  alt={user.username} 
                  data-testid="user-avatar"
                />
              )}
              <AvatarFallback className="text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-semibold" data-testid="user-name">
                  {user.username}
                </h2>
                <StatusIndicator status={status} size="sm" />
              </div>

              <p className="text-muted-foreground" data-testid="user-major">
                {user.major}
              </p>
            </div>
          </div>

          <Separator />

          {/* Status Information */}
          {(currentClass || nextClass) && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <h3 className="font-medium flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Class Status
                  </h3>
                  
                  {currentClass && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Currently in: </span>
                      <span className="font-medium text-primary" data-testid="current-class">
                        {currentClass}
                      </span>
                    </div>
                  )}
                  
                  {nextClass && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Next class: </span>
                      <span className="font-medium" data-testid="next-class">
                        {nextClass}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Personal Information
            </h3>

            <div className="grid gap-3">
              {/* College */}
              {user.college && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    College
                  </span>
                  <span className="text-sm font-medium" data-testid="user-college">
                    {user.college}
                  </span>
                </div>
              )}

              {/* Dorm */}
              {user.dorm && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Dorm
                  </span>
                  <span className="text-sm font-medium" data-testid="user-dorm">
                    {user.dorm}
                  </span>
                </div>
              )}

              {/* Gender */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Gender
                </span>
                <Badge 
                  variant={getGenderBadgeVariant(user.gender)}
                  data-testid="user-gender"
                >
                  {formatGenderDisplay(user.gender)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          {user.bio && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  About
                </h3>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground leading-relaxed" data-testid="user-bio">
                      {user.bio}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Empty state message for minimal profiles */}
          {!user.bio && !user.college && !user.dorm && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                This user hasn't shared additional details yet.
              </p>
            </div>
          )}

          {/* Chat functionality */}
          <div className="pt-2">
            {!showChat ? (
              <Button 
                className="w-full" 
                onClick={handleStartChat}
                variant="outline"
                data-testid="button-say-hello"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Say Hello
              </Button>
            ) : (
              <div className="space-y-4">
                <ChatInterface
                  currentUserId={currentUserId}
                  otherUser={user}
                  onClose={handleCloseChat}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}