import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketMessage, MessageWithSender } from '@shared/schema';

export interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (message: Omit<WebSocketMessage, 'type'> & { type?: string }) => void;
  authenticate: (userId: string) => Promise<void>;
  disconnect: () => void;
  lastMessage: MessageWithSender | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<MessageWithSender | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const userIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    
    // Handle cases where port might be undefined or missing
    if (!host || host.includes('undefined')) {
      // Fallback to current host with explicit port
      const hostname = window.location.hostname || 'localhost';
      const port = window.location.port || '5000';
      host = `${hostname}:${port}`;
    }
    
    return `${protocol}//${host}/ws`;
  };

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Authenticate with secure token if userId is available
        if (userIdRef.current) {
          try {
            // Check if we already have a token stored
            const storedToken = (ws as any)._authToken;
            
            if (storedToken) {
              ws.send(JSON.stringify({
                type: 'auth',
                data: { token: storedToken, userId: userIdRef.current }
              }));
              console.log('WebSocket authenticating with stored token');
            } else {
              // Get fresh token
              const response = await fetch('/api/auth/ws-token', {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const { token, userId: authenticatedUserId } = await response.json();
                userIdRef.current = authenticatedUserId;
                
                ws.send(JSON.stringify({
                  type: 'auth',
                  data: { token, userId: authenticatedUserId }
                }));
                
                console.log('WebSocket authenticated with fresh token for user:', authenticatedUserId);
              } else {
                console.error('Failed to get authentication token on WebSocket open');
                setConnectionStatus('error');
              }
            }
          } catch (error) {
            console.error('Error authenticating WebSocket on open:', error);
            setConnectionStatus('error');
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'message':
              setLastMessage(message.data as MessageWithSender);
              break;
            case 'user_online':
              console.log('User online status:', message.data);
              break;
            case 'user_offline':
              console.log('User offline status:', message.data);
              break;
            case 'typing':
              // Handle typing indicators
              console.log('Typing indicator:', message.data);
              break;
            case 'read_receipt':
              // Handle read receipts
              console.log('Read receipt:', message.data);
              break;
            case 'error':
              console.error('WebSocket error message:', message.data);
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Attempt to reconnect if not a clean close and we have attempts left
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Exponential backoff
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    userIdRef.current = null;
    reconnectAttemptsRef.current = 0;
  }, []);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'type'> & { type?: string }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        type: message.type || 'message',
        data: message.data
      };
      
      wsRef.current.send(JSON.stringify(fullMessage));
    } else {
      console.warn('WebSocket is not connected, cannot send message');
    }
  }, []);

  const authenticate = useCallback(async (userId: string) => {
    userIdRef.current = userId;
    
    try {
      // SECURITY: Get secure authentication token from server instead of trusting userId
      const response = await fetch('/api/auth/ws-token', {
        method: 'POST',
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('Failed to get WebSocket authentication token:', response.status);
        setConnectionStatus('error');
        return;
      }
      
      const { token, userId: authenticatedUserId } = await response.json();
      
      // Update to use the server-verified userId
      userIdRef.current = authenticatedUserId;
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Send secure token for authentication instead of raw userId
        sendMessage({
          type: 'auth',
          data: { token, userId: authenticatedUserId } // Include both for backward compatibility
        });
        
        console.log('WebSocket authenticating with secure token for user:', authenticatedUserId);
      } else {
        // Store token for when connection opens
        (wsRef.current as any)._authToken = token;
        connect();
      }
    } catch (error) {
      console.error('Error getting WebSocket authentication token:', error);
      setConnectionStatus('error');
    }
  }, [connect, sendMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    sendMessage,
    authenticate,
    disconnect,
    lastMessage,
    connectionStatus
  };
}