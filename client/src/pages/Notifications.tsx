import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PendingFriendRequest } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bell, Users, UserCheck, UserX, AlertCircle, ArrowLeft, Home } from "lucide-react";
import { Link } from "wouter";

export default function Notifications() {
  const { toast } = useToast();

  // Fetch pending friend requests
  const { data: pendingRequests, isLoading } = useQuery<PendingFriendRequest[]>({
    queryKey: ['/api/friends/requests'],
  });

  // Accept friend request mutation
  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest('PUT', `/api/friends/requests/${requestId}/accept`);
    },
    onSuccess: (data, requestId) => {
      toast({
        title: "Friend request accepted",
        description: "You are now friends!",
      });
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['/api/friends/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/search'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept request",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Reject friend request mutation
  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest('PUT', `/api/friends/requests/${requestId}/reject`);
    },
    onSuccess: (data, requestId) => {
      toast({
        title: "Friend request declined",
        description: "The request has been removed.",
      });
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['/api/friends/requests'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to decline request",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const handleAcceptRequest = (requestId: string) => {
    acceptRequestMutation.mutate(requestId);
  };

  const handleRejectRequest = (requestId: string) => {
    rejectRequestMutation.mutate(requestId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const pendingCount = pendingRequests?.length || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" data-testid="link-back-home">
          <Button variant="ghost" size="sm" className="mr-2 hover-elevate">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <Bell className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Notifications</h1>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="ml-2">
            {pendingCount}
          </Badge>
        )}
      </div>

      {/* Friend Request Notifications */}
      <Card className="mb-6" data-testid="friend-requests-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friend Requests
            {pendingCount > 0 && (
              <Badge variant="secondary">
                {pendingCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending friend requests</p>
              <p className="text-sm">When someone sends you a friend request, it will appear here.</p>
            </div>
          ) : (
            pendingRequests?.map((request) => {
              const displayName = request.requester.fullName || request.requester.username;
              const initials = displayName
                .split(" ")
                .map(n => n[0])
                .join("")
                .toUpperCase();

              return (
                <Card key={request.id} className="hover-elevate" data-testid={`friend-request-${request.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        {request.requester.avatar && (
                          <AvatarImage src={request.requester.avatar} alt={displayName} />
                        )}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-sm truncate">{displayName}</h3>
                          {request.requester.fullName && (
                            <span className="text-xs text-muted-foreground">@{request.requester.username}</span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2">{request.requester.major}</p>
                        
                        {request.requester.grade && (
                          <p className="text-xs text-muted-foreground mb-2">Grade: {request.requester.grade}</p>
                        )}

                        {request.requester.bio && (
                          <p className="text-xs text-foreground mb-3">{request.requester.bio}</p>
                        )}

                        {request.requester.hobbies && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-1">
                              {request.requester.hobbies.split(',').map((hobby, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {hobby.trim()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground mb-3">
                          Sent on {new Date(request.createdAt!).toLocaleDateString()}
                        </p>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={acceptRequestMutation.isPending || rejectRequestMutation.isPending}
                            className="flex-1"
                            data-testid={`accept-request-${request.id}`}
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            {acceptRequestMutation.isPending ? "Accepting..." : "Accept"}
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={acceptRequestMutation.isPending || rejectRequestMutation.isPending}
                            className="flex-1"
                            data-testid={`reject-request-${request.id}`}
                          >
                            <UserX className="h-3 w-3 mr-1" />
                            {rejectRequestMutation.isPending ? "Declining..." : "Decline"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Future: Other notification types could be added here */}
      {/* Study group invitations, event reminders, etc. */}
    </div>
  );
}