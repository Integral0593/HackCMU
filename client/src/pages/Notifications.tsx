import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PendingFriendRequest, MessageNotificationWithSender } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bell, Users, UserCheck, UserX, AlertCircle, ArrowLeft, Home, MessageSquare, Eye, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Notifications() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch pending friend requests
  const { data: pendingRequests, isLoading: friendRequestsLoading } = useQuery<PendingFriendRequest[]>({
    queryKey: ['/api/friends/requests'],
  });

  // Fetch message notifications
  const { data: messageNotifications, isLoading: messageNotificationsLoading } = useQuery<MessageNotificationWithSender[]>({
    queryKey: ['/api/notifications/messages'],
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

  // Mark message notification as read mutation
  const markMessageNotificationAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest('POST', `/api/notifications/messages/${notificationId}/read`);
    },
    onSuccess: () => {
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/messages/unread-count'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to mark notification as read",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Delete message notification mutation
  const deleteMessageNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest('DELETE', `/api/notifications/messages/${notificationId}`);
    },
    onSuccess: () => {
      toast({
        title: "Notification deleted",
        description: "The message notification has been removed.",
      });
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/messages/unread-count'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete notification",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Handle clicking on a message notification to go to chat
  const handleMessageNotificationClick = async (notification: MessageNotificationWithSender) => {
    try {
      // Mark notification as read if it's not already read
      if (!notification.isRead) {
        await markMessageNotificationAsRead.mutateAsync(notification.id);
      }
      
      // Navigate to the chat with this user
      const chatData = {
        user1Id: notification.recipientId,
        user2Id: notification.senderId
      };
      
      // Create or get existing chat
      const chat = await apiRequest('POST', '/api/chats', chatData);
      
      // Navigate to the chat interface - you'll need to implement this route
      navigate(`/chat/${chat.id}`);
      
    } catch (error: any) {
      toast({
        title: "Failed to open chat",
        description: error.message || "An error occurred opening the chat",
        variant: "destructive"
      });
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markMessageNotificationAsRead.mutate(notificationId);
  };

  const handleDeleteNotification = (notificationId: string) => {
    deleteMessageNotification.mutate(notificationId);
  };

  if (friendRequestsLoading || messageNotificationsLoading) {
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
  const messageNotificationsCount = messageNotifications?.length || 0;
  const totalNotificationsCount = pendingCount + messageNotificationsCount;

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
        {totalNotificationsCount > 0 && (
          <Badge variant="destructive" className="ml-2">
            {totalNotificationsCount}
          </Badge>
        )}
      </div>

      {/* Message Notifications */}
      <Card className="mb-6" data-testid="message-notifications-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message Notifications
            {messageNotificationsCount > 0 && (
              <Badge variant="secondary">
                {messageNotificationsCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messageNotificationsCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No message notifications</p>
              <p className="text-sm">When someone sends you a message, notifications will appear here.</p>
            </div>
          ) : (
            messageNotifications?.map((notification) => {
              const displayName = notification.sender.fullName || notification.sender.username;
              const initials = displayName
                .split(" ")
                .map(n => n[0])
                .join("")
                .toUpperCase();

              return (
                <Card key={notification.id} className={`hover-elevate cursor-pointer transition-colors ${
                  notification.isRead ? 'opacity-75' : 'border-l-4 border-l-blue-500'
                }`} data-testid={`message-notification-${notification.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        {notification.sender.avatar && (
                          <AvatarImage src={notification.sender.avatar} alt={displayName} />
                        )}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0" onClick={() => handleMessageNotificationClick(notification)}>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-sm truncate">{displayName}</h3>
                          {notification.sender.fullName && (
                            <span className="text-xs text-muted-foreground">@{notification.sender.username}</span>
                          )}
                          {!notification.isRead && (
                            <Badge variant="destructive" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2">{notification.sender.major}</p>
                        
                        <div className="bg-muted/50 rounded-md p-2 mb-3">
                          <p className="text-sm text-foreground line-clamp-2">
                            {notification.messagePreview}
                          </p>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-3">
                          {new Date(notification.createdAt!).toLocaleString()}
                        </p>
                        
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleMessageNotificationClick(notification)}
                            className="flex-1"
                            data-testid={`open-chat-${notification.id}`}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Open Chat
                          </Button>
                          
                          {!notification.isRead && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markMessageNotificationAsRead.isPending}
                              data-testid={`mark-read-${notification.id}`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Mark Read
                            </Button>
                          )}
                          
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteNotification(notification.id)}
                            disabled={deleteMessageNotification.isPending}
                            data-testid={`delete-notification-${notification.id}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
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