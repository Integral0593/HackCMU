import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, X, AlertCircle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Chat, 
  MessageWithSender, 
  User,
  InsertMessage 
} from '@shared/schema';
import { format } from 'date-fns';

interface ChatInterfaceProps {
  currentUserId: string;
  otherUser: User;
  onClose?: () => void;
  className?: string;
}

export default function ChatInterface({ 
  currentUserId, 
  otherUser, 
  onClose,
  className = ""
}: ChatInterfaceProps) {
  const [messageInput, setMessageInput] = useState('');
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Validate currentUserId
  const isValidUser = currentUserId && currentUserId.trim() !== '';
  
  const { 
    sendMessage: sendWebSocketMessage, 
    authenticate, 
    lastMessage, 
    isConnected,
    connectionStatus 
  } = useWebSocket();

  // Initialize WebSocket connection only if user is valid
  useEffect(() => {
    if (isValidUser) {
      authenticate(currentUserId);
    }
  }, [currentUserId, authenticate, isValidUser]);

  // Create or get existing chat
  const { data: chat, isLoading: chatLoading } = useQuery({
    queryKey: ['/api/chats', 'between', currentUserId, otherUser.id],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/chats', {
        user1Id: currentUserId,
        user2Id: otherUser.id
      });
      return response.json();
    },
    enabled: isValidUser && !!otherUser.id
  });

  // Set current chat when loaded
  useEffect(() => {
    if (chat) {
      setCurrentChat(chat);
    }
  }, [chat]);

  // Fetch messages for current chat
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/chats', currentChat?.id, 'messages'],
    queryFn: async () => {
      if (!currentChat?.id) return [];
      const response = await fetch(`/api/chats/${currentChat.id}/messages?limit=50`);
      return response.json();
    },
    enabled: !!currentChat?.id
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: InsertMessage) => {
      const response = await apiRequest(
        'POST', 
        `/api/chats/${currentChat?.id}/messages`, 
        messageData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/chats', currentChat?.id, 'messages'] 
      });
    }
  });

  // Handle new messages from WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.chatId === currentChat?.id) {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/chats', currentChat?.id, 'messages'] 
      });
    }
  }, [lastMessage, currentChat?.id, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    // Validate preconditions
    if (!isValidUser) {
      setSendError('Please log in to send messages');
      toast({
        title: 'Authentication Required',
        description: 'Please log in to send messages',
        variant: 'destructive'
      });
      return;
    }
    
    if (!messageInput.trim() || !currentChat || sendMessageMutation.isPending) {
      return;
    }

    setSendError(null);
    
    const messageData: InsertMessage = {
      chatId: currentChat.id,
      senderId: currentUserId,
      content: messageInput.trim(),
      messageType: 'text'
    };

    try {
      // Always send via HTTP for consistency and reliability
      // WebSocket is used only for real-time updates
      await sendMessageMutation.mutateAsync(messageData);
      setMessageInput('');
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMessage = error?.message || 'Failed to send message. Please try again.';
      setSendError(errorMessage);
      toast({
        title: 'Message Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string | Date) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Show error state for invalid user
  if (!isValidUser) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-96 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <div className="text-lg font-medium mb-2">Authentication Required</div>
          <div className="text-muted-foreground mb-4">
            Please log in to start chatting with {otherUser.username}
          </div>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  if (chatLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading chat...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {otherUser.avatar && (
              <AvatarImage src={otherUser.avatar} alt={otherUser.username} />
            )}
            <AvatarFallback className="text-sm">
              {getInitials(otherUser.username)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium" data-testid="chat-user-name">
              {otherUser.username}
            </div>
            <div className="text-xs text-muted-foreground">
              {connectionStatus === 'connected' ? 'Online' : 'Offline'}
            </div>
          </div>
        </CardTitle>
        {onClose && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            data-testid="button-close-chat"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      
      <Separator />

      <CardContent className="flex flex-col h-96 p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" data-testid="messages-container">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-muted-foreground mb-2">
                No messages yet
              </div>
              <div className="text-sm text-muted-foreground">
                Start the conversation by saying hello!
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message: MessageWithSender) => {
                const isOwnMessage = message.senderId === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    data-testid={`message-${message.id}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm">{message.content}</div>
                      <div
                        className={`text-xs mt-1 ${
                          isOwnMessage
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {formatMessageTime(message.sentAt!)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Message Input Area */}
        <div className="p-4">
          {!isValidUser ? (
            <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                <div className="text-sm">Please log in to send messages</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sendMessageMutation.isPending || !isValidUser}
                  data-testid="input-message"
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    !isValidUser ||
                    !messageInput.trim() || 
                    sendMessageMutation.isPending || 
                    !currentChat
                  }
                  size="icon"
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Error message display */}
              {sendError && (
                <div className="text-xs text-destructive mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {sendError}
                </div>
              )}
              
              {/* Connection status */}
              {connectionStatus !== 'connected' && (
                <div className="text-xs text-muted-foreground mt-2">
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Offline - messages will be sent via HTTP'}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}