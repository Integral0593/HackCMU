import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import StatusIndicator from "./StatusIndicator";
import { User } from "@shared/schema";
import { cn } from "@/lib/utils";

type StatusType = "studying" | "free" | "in_class" | "busy" | "tired" | "social";

interface UserCardProps {
  user: Pick<User, "id" | "username" | "major" | "avatar">;
  status: StatusType;
  currentClass?: string;
  nextClass?: string;
  onClick?: () => void;
}

export default function UserCard({ 
  user, 
  status, 
  currentClass, 
  nextClass, 
  onClick 
}: UserCardProps) {
  const initials = user.username
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card 
      className={cn(
        "hover-elevate cursor-pointer transition-all duration-200",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      data-testid={`user-card-${user.id}`}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <Avatar className="h-10 w-10">
          {user.avatar && <AvatarImage src={user.avatar} alt={user.username} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{user.username}</h3>
            <StatusIndicator status={status} size="sm" />
          </div>
          
          <p className="text-xs text-muted-foreground truncate">{user.major}</p>
          
          {currentClass && (
            <p className="text-xs text-primary font-medium truncate">
              In {currentClass}
            </p>
          )}
          
          {nextClass && (
            <p className="text-xs text-muted-foreground truncate">
              Next: {nextClass}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}