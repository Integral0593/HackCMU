import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserCard from "./UserCard";
import { CurrentStatusResponse } from "@shared/schema";
import { Users, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBoardProps {
  statusData: CurrentStatusResponse | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onUserClick?: (userId: string) => void;
  className?: string;
}

export default function StatusBoard({ 
  statusData, 
  isLoading = false, 
  onRefresh,
  onUserClick,
  className 
}: StatusBoardProps) {
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading && !statusData) {
    return (
      <div className={cn("grid md:grid-cols-2 gap-6", className)}>
        <Card>
          <CardHeader>
            <div className="animate-pulse h-6 bg-muted rounded w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-md">
                    <div className="h-10 w-10 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="animate-pulse h-6 bg-muted rounded w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-md">
                    <div className="h-10 w-10 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {statusData ? `Updated at ${formatTime(statusData.now)}` : 'No data'}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          data-testid="refresh-status"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Status boards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* In Class */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              In Class ({statusData?.in_class.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="in-class-list">
              {statusData?.in_class.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No one is currently in class
                </p>
              ) : (
                statusData?.in_class.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    status={user.manual_status as any}
                    currentClass={user.current_class}
                    onClick={() => onUserClick?.(user.id)}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Free */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-status-free" />
              Available ({statusData?.free.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="free-list">
              {statusData?.free.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No one is currently available
                </p>
              ) : (
                statusData?.free.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    status={user.manual_status as any}
                    nextClass={user.next_class}
                    onClick={() => onUserClick?.(user.id)}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}