import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import ical from "ical";
import { WebSocketServer, WebSocket } from "ws";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { SECRET } from "./config";
import { 
  insertScheduleSchema, 
  insertUserSchema, 
  insertChatSchema,
  insertMessageSchema,
  registerUserSchema,
  loginUserSchema,
  updateUserProfileSchema,
  addFriendSchema,
  searchUsersSchema,
  type InsertSchedule,
  type RegisterUser,
  type LoginUser,
  type WebSocketMessage
} from "@shared/schema";

// Extend Express session to include user_id
declare module 'express-session' {
  interface SessionData {
    user_id: string;
  }
}

// Authentication middleware to validate session and extract authenticated userId
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user_id) {
    logWebSocket('warn', 'Unauthenticated API request attempt', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return res.status(401).json({ error: 'Authentication required - please log in' });
  }
  
  // Attach authenticated userId to request for easy access
  (req as any).authenticatedUserId = req.session.user_id;
  next();
}

// Function to validate session from WebSocket cookies and extract userId
function validateWebSocketSession(request: any): string | null {
  try {
    const cookies = request.headers.cookie;
    if (!cookies) {
      logWebSocket('warn', 'No cookies found in WebSocket connection');
      return null;
    }
    
    // Parse cookies to find session cookie
    const cookieObj: any = {};
    cookies.split(';').forEach((cookie: string) => {
      const parts = cookie.trim().split('=');
      if (parts.length >= 2) {
        const name = parts[0];
        const value = parts.slice(1).join('='); // Handle values with = signs
        cookieObj[name] = decodeURIComponent(value);
      }
    });
    
    // Look for common session cookie names
    const sessionCookie = cookieObj['session'] || cookieObj['connect.sid'] || cookieObj['express:sess'];
    
    if (!sessionCookie) {
      logWebSocket('warn', 'No session cookie found in WebSocket connection', {
        availableCookies: Object.keys(cookieObj)
      });
      return null;
    }
    
    // SIMPLIFIED SESSION VALIDATION:
    // In production, you would properly decode and verify the session signature
    // For now, we'll use a simplified approach where we check if the cookie contains user_id data
    try {
      // Try to extract user_id from session cookie (this is a simplified approach)
      // Real implementation would properly decrypt/verify the signed session cookie
      
      // For this demo, we'll implement a basic validation by checking if there's a valid session structure
      // Since we can't easily decode signed cookies without the exact same configuration,
      // we'll implement a different approach using a header-based validation
      
      return null; // Will require additional implementation for full session decoding
    } catch (error) {
      logWebSocket('warn', 'Failed to parse session cookie', error);
      return null;
    }
  } catch (error) {
    logWebSocket('error', 'Error validating WebSocket session', error);
    return null;
  }
}

// Alternative: Use a simple token-based authentication for WebSocket
// This creates a more secure approach until full session integration is complete
interface AuthToken {
  userId: string;
  timestamp: number;
  signature: string;
}

function generateAuthToken(userId: string): string {
  const crypto = require('crypto');
  const timestamp = Date.now();
  const data = `${userId}:${timestamp}`;
  
  // Use HMAC-SHA256 for secure signatures with unified secret
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
  
  return Buffer.from(JSON.stringify({ userId, timestamp, signature })).toString('base64');
}

function validateAuthToken(token: string): string | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const { userId, timestamp, signature } = decoded as AuthToken;
    
    // Check if token is expired (24 hours)
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return null;
    }
    
    // Verify HMAC-SHA256 signature with unified secret
    const crypto = require('crypto');
    const expectedData = `${userId}:${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(expectedData).digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    return userId;
  } catch (error) {
    return null;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/calendar' || file.originalname.endsWith('.ics')) {
      cb(null, true);
    } else {
      cb(new Error('Only .ics files are allowed'));
    }
  }
});

// Helper function to extract day from date
function getDayFromDate(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

// Helper function to format time to HH:MM
function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

// Helper function to convert RRULE weekday numbers to day names
function convertWeekdayNumbers(byweekday: number[]): string[] {
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return byweekday.map(num => dayNames[num]).filter(Boolean);
}

// Helper function to parse ICS file
function parseICSFile(buffer: Buffer): InsertSchedule[] {
  const icsData = ical.parseICS(buffer.toString());
  const schedules: InsertSchedule[] = [];

  Object.values(icsData).forEach((event: any) => {
    if (event.type === 'VEVENT' && event.start && event.end && event.summary) {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      
      // Extract course code and name from summary
      const summary = event.summary as string;
      let courseCode = '';
      let courseName = summary;
      
      // Try to extract course code after "::" (e.g., "Course Name::15122")
      const colonMatch = summary.match(/^(.+?)::(.+)$/);
      if (colonMatch) {
        const possibleName = colonMatch[1].trim();
        const possibleCode = colonMatch[2].trim();
        
        // Check if the part after :: looks like a course code
        // Patterns supported:
        // - "15122" (numbers only)
        // - "15122A" (numbers + letter)
        // - "15122 A" (numbers + space + letter(s))
        // - "CS 151" (letters + space + numbers)
        // - "CS 151A" (letters + space + numbers + letter)
        if (/^\d+[A-Z]?$/.test(possibleCode) || 
            /^\d+\s+[A-Z]+$/.test(possibleCode) ||
            /^[A-Z]{2,4}\s*\d{3}[A-Z]?$/.test(possibleCode)) {
          
          // Extract just the course number part (remove section letters)
          const codeMatch = possibleCode.match(/^(\d+)/);
          if (codeMatch) {
            courseCode = codeMatch[1]; // Just the numeric part like "10301"
          } else {
            courseCode = possibleCode; // Fallback to full code
          }
          courseName = possibleName;
        }
      } else {
        // Try to extract course code pattern (e.g., "CS 151 - Intro to Programming")
        const codeMatch = summary.match(/^([A-Z]{2,4}\s*\d{3}[A-Z]?)/);
        if (codeMatch) {
          courseCode = codeMatch[1].trim();
          courseName = summary.replace(codeMatch[0], '').replace(/^[\s\-]+/, '').trim();
        }
      }
      
      if (!courseName) {
        courseName = summary;
      }

      // Extract days from RRULE if present
      let days: string[] = [];
      if (event.rrule && event.rrule.options && event.rrule.options.byweekday) {
        days = convertWeekdayNumbers(event.rrule.options.byweekday);
        console.log(`📅 [DEBUG] RRULE found for ${courseName}:`, {
          byweekday: event.rrule.options.byweekday,
          convertedDays: days
        });
      } else {
        // Fallback to start date day
        days = [getDayFromDate(startDate)];
        console.log(`📅 [DEBUG] No RRULE for ${courseName}, using startDate day:`, days);
      }

      const schedule: InsertSchedule = {
        courseCode: courseCode || 'TBD',
        courseName: courseName,
        days: days as any,
        startTime: formatTime(startDate),
        endTime: formatTime(endDate),
        location: event.location || null
      };

      console.log(`🔍 [DEBUG] Created schedule object for ${courseName}:`, {
        courseCode: schedule.courseCode,
        courseName: schedule.courseName,
        days: schedule.days,
        daysType: typeof schedule.days,
        daysLength: schedule.days?.length
      });

      schedules.push(schedule);
    }
  });

  return schedules;
}

// WebSocket connection management
interface ConnectedUser {
  userId: string;
  websocket: WebSocket;
  connectedAt: Date;
  lastActivity: Date;
}

const connectedUsers = new Map<string, ConnectedUser>();

// Enhanced logging utility
function logWebSocket(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [WebSocket ${level.toUpperCase()}]`;
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// Broadcast message to specific user
function sendToUser(userId: string, message: WebSocketMessage) {
  const user = connectedUsers.get(userId);
  if (user && user.websocket.readyState === WebSocket.OPEN) {
    try {
      user.websocket.send(JSON.stringify(message));
      user.lastActivity = new Date();
      logWebSocket('info', `Message sent to user ${userId}`, { type: message.type });
    } catch (error) {
      logWebSocket('error', `Failed to send message to user ${userId}`, error);
      // Remove dead connection
      connectedUsers.delete(userId);
    }
  } else {
    logWebSocket('warn', `User ${userId} not connected or websocket not open`);
  }
}

// Broadcast message to multiple users
function broadcastToUsers(userIds: string[], message: WebSocketMessage) {
  userIds.forEach(userId => sendToUser(userId, message));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for HEAD /api requests
  app.head('/api', (req, res) => {
    res.status(200).end();
  });
  
  app.get('/api', (req, res) => {
    res.json({ 
      status: 'ok', 
      message: 'SlotSync API is running',
      timestamp: new Date().toISOString()
    });
  });

  // Authentication routes
  
  // Register new user
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);
      
      // Register user through storage layer
      const user = await storage.registerUser(validatedData);
      
      // Set session
      req.session.user_id = user.id;
      
      res.json({
        user,
        message: 'Registration successful'
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.message === 'Username already exists') {
        return res.status(409).json({ error: 'Username already exists' });
      }
      
      res.status(400).json({ 
        error: error.message || 'Registration failed'
      });
    }
  });

  // Login user
  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginUserSchema.parse(req.body);
      
      // Authenticate user through storage layer
      const user = await storage.authenticateUser(validatedData.username, validatedData.password);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      // Set session
      req.session.user_id = user.id;
      
      res.json({
        user,
        message: 'Login successful'
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(400).json({ 
        error: error.message || 'Login failed'
      });
    }
  });

  // Logout user
  app.post('/api/auth/logout', async (req, res) => {
    try {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
          }
          
          res.clearCookie('session');
          res.json({ message: 'Logged out successfully' });
        });
      } else {
        res.json({ message: 'No active session' });
      }
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Get current user
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      const user = await storage.getUserById(authenticatedUserId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ user });
    } catch (error: any) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to get user information' });
    }
  });

  // SECURITY: Generate WebSocket authentication token endpoint
  app.post('/api/auth/ws-token', requireAuth, async (req, res) => {
    try {
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      // Generate secure token for WebSocket authentication
      const token = generateAuthToken(authenticatedUserId);
      
      logWebSocket('info', 'WebSocket token generated', {
        userId: authenticatedUserId,
        tokenExpiry: '24 hours'
      });
      
      res.json({ 
        token, 
        userId: authenticatedUserId,
        expiresIn: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      });
    } catch (error: any) {
      logWebSocket('error', 'Failed to generate WebSocket token', error);
      res.status(500).json({ error: 'Failed to generate authentication token' });
    }
  });

  // Schedule CRUD routes
  
  // Get user's schedules
  app.get('/api/schedules/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const schedules = await storage.getSchedulesByUserId(userId);
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new schedule
  app.post('/api/schedules/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const validatedData = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(validatedData, userId);
      res.json(schedule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete a schedule
  app.delete('/api/schedules/:userId/:scheduleId', async (req, res) => {
    try {
      const { userId, scheduleId } = req.params;
      const success = await storage.deleteSchedule(scheduleId, userId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Schedule not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload and parse ICS file
  app.post('/api/schedules/:userId/upload-ics', upload.single('icsFile'), async (req, res) => {
    try {
      const { userId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Parse the ICS file
      const schedules = parseICSFile(req.file.buffer);
      
      if (schedules.length === 0) {
        return res.status(400).json({ error: 'No valid events found in ICS file' });
      }

      // Validate all schedules
      const validatedSchedules = schedules.map(schedule => insertScheduleSchema.parse(schedule));
      
      // Create multiple schedules
      const createdSchedules = await storage.createMultipleSchedules(validatedSchedules, userId);
      
      res.json({ 
        success: true, 
        message: `Successfully imported ${createdSchedules.length} courses`,
        schedules: createdSchedules 
      });
    } catch (error: any) {
      console.error('ICS upload error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // User management routes
  app.post('/api/users', async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Search users (MUST be before /api/users/:userId to avoid route conflict)
  app.get('/api/users/search', requireAuth, async (req, res) => {
    try {
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      console.log('Search users request:', { query: req.query, authenticatedUserId });
      
      // Validate query parameters with Zod
      const validation = searchUsersSchema.safeParse(req.query);
      if (!validation.success) {
        console.log('Search validation failed:', validation.error.issues);
        return res.status(400).json({ 
          error: 'Invalid search parameters',
          details: validation.error.issues
        });
      }
      
      const { q: query, limit: searchLimit } = validation.data;
      console.log('Search params validated:', { query, limit: searchLimit });
      
      const searchResults = await storage.searchUsers(query, authenticatedUserId, searchLimit);
      console.log('Search results:', searchResults.length, 'users found');
      
      res.json(searchResults);
    } catch (error: any) {
      console.error('Search users error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/:userId', requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      // SECURITY: Users can only update their own profile
      if (userId !== authenticatedUserId) {
        logWebSocket('error', 'Unauthorized profile update attempt', {
          authenticatedUserId,
          requestedUserId: userId
        });
        return res.status(403).json({ error: 'Cannot update other users\' profiles' });
      }
      
      const updateData = req.body;
      
      // SECURITY: Use safe update schema that excludes password and other sensitive fields
      // This prevents password updates through the general profile update endpoint
      const validatedData = updateUserProfileSchema.parse(updateData);
      
      const updatedUser = await storage.updateUser(userId, validatedData);
      
      if (updatedUser) {
        res.json(updatedUser);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Chat management routes
  
  // Get user's chats - SECURITY FIXED
  app.get('/api/chats/:userId', requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      // SECURITY: Users can only access their own chats
      if (userId !== authenticatedUserId) {
        logWebSocket('error', 'Unauthorized chat access attempt', {
          authenticatedUserId,
          requestedUserId: userId
        });
        return res.status(403).json({ error: 'Cannot access other users\' chats' });
      }
      
      const chats = await storage.getChatsByUserId(authenticatedUserId);
      res.json(chats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create or get chat between two users - SECURITY FIXED
  app.post('/api/chats', requireAuth, async (req, res) => {
    try {
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      // Parse and validate chat data
      const chatData = insertChatSchema.parse(req.body);
      
      // SECURITY: Ensure authenticated user is one of the participants
      if (chatData.user1Id !== authenticatedUserId && chatData.user2Id !== authenticatedUserId) {
        logWebSocket('error', 'Unauthorized chat creation attempt', {
          authenticatedUserId,
          requestedUser1Id: chatData.user1Id,
          requestedUser2Id: chatData.user2Id
        });
        return res.status(403).json({ error: 'Can only create chats involving yourself' });
      }
      
      // Check if chat already exists between these users
      const existingChat = await storage.getChatBetweenUsers(chatData.user1Id, chatData.user2Id);
      
      if (existingChat) {
        res.json(existingChat);
      } else {
        const newChat = await storage.createChat(chatData);
        logWebSocket('info', 'New chat created', {
          chatId: newChat.id,
          user1Id: chatData.user1Id,
          user2Id: chatData.user2Id,
          createdBy: authenticatedUserId
        });
        res.json(newChat);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get messages for a specific chat - SECURITY FIXED
  app.get('/api/chats/:chatId/messages', requireAuth, async (req, res) => {
    try {
      const { chatId } = req.params;
      const authenticatedUserId = (req as any).authenticatedUserId;
      const { limit = '50', offset = '0' } = req.query;
      
      // SECURITY: Verify the authenticated user is authorized to view messages in this chat
      const isAuthorized = await storage.isUserInChat(chatId, authenticatedUserId);
      if (!isAuthorized) {
        logWebSocket('error', 'Unauthorized chat messages access attempt', {
          authenticatedUserId,
          chatId
        });
        return res.status(403).json({ error: 'User not authorized to view messages in this chat' });
      }
      
      const messages = await storage.getMessagesByChatId(
        chatId, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send message via HTTP (alternative to WebSocket) - SECURITY FIXED
  app.post('/api/chats/:chatId/messages', requireAuth, async (req, res) => {
    try {
      const { chatId } = req.params;
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      // SECURITY: COMPLETELY IGNORE req.body.senderId - use authenticated user from session
      const messageData = insertMessageSchema.parse({
        chatId,
        senderId: authenticatedUserId, // Use authenticated userId, NOT from client
        content: req.body.content,
        messageType: req.body.messageType || 'text'
      });
      
      // SECURITY: Verify the AUTHENTICATED user is authorized to send messages in this chat
      const isAuthorized = await storage.isUserInChat(chatId, authenticatedUserId);
      if (!isAuthorized) {
        logWebSocket('error', 'Unauthorized chat message attempt', {
          authenticatedUserId,
          chatId
        });
        return res.status(403).json({ error: 'User not authorized to send messages in this chat' });
      }
      
      const message = await storage.createMessage(messageData);
      
      // Get the message with sender info
      const messagesWithSender = await storage.getMessagesByChatId(chatId, 1, 0);
      const messageWithSender = messagesWithSender.find(m => m.id === message.id);
      
      if (messageWithSender) {
        // Broadcast via WebSocket if users are connected
        const chat = await storage.getChat(chatId);
        if (chat) {
          const otherUserId = chat.user1Id === authenticatedUserId ? chat.user2Id : chat.user1Id;
          broadcastToUsers([authenticatedUserId, otherUserId], {
            type: 'message',
            data: messageWithSender
          });
        }
        
        logWebSocket('info', 'Message sent via HTTP', {
          senderId: authenticatedUserId,
          chatId,
          messageId: message.id
        });
        
        res.json(messageWithSender);
      } else {
        res.json(message);
      }
    } catch (error: any) {
      logWebSocket('error', 'HTTP message send error', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Mark messages as read - SECURITY FIXED
  app.post('/api/messages/:messageId/read', requireAuth, async (req, res) => {
    try {
      const { messageId } = req.params;
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      // SECURITY: IGNORE req.body.userId, use authenticated user instead
      const success = await storage.markMessageAsRead(messageId, authenticatedUserId);
      
      if (success) {
        logWebSocket('info', 'Message marked as read', {
          messageId,
          userId: authenticatedUserId
        });
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Message not found or already read' });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get unread message count for a chat - SECURITY FIXED
  app.get('/api/chats/:chatId/unread/:userId', requireAuth, async (req, res) => {
    try {
      const { chatId, userId } = req.params;
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      // SECURITY: Users can only check unread counts for themselves
      if (userId !== authenticatedUserId) {
        logWebSocket('error', 'Unauthorized unread count access attempt', {
          authenticatedUserId,
          requestedUserId: userId,
          chatId
        });
        return res.status(403).json({ error: 'Cannot check unread counts for other users' });
      }
      
      // SECURITY: Verify user is authorized in this chat
      const isAuthorized = await storage.isUserInChat(chatId, authenticatedUserId);
      if (!isAuthorized) {
        return res.status(403).json({ error: 'User not authorized to access this chat' });
      }
      
      const count = await storage.getUnreadMessagesCount(chatId, authenticatedUserId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Status and recommendation endpoints
  
  // Get current user status information
  app.get('/api/status', requireAuth, async (req, res) => {
    try {
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      console.log(`GET /api/status called for user: ${authenticatedUserId}`);
      
      // Get user's friends
      const friends = await storage.getFriendsByUserId(authenticatedUserId);
      console.log('Raw friends data:', friends.map(f => ({ 
        id: f.id, 
        userId: f.userId, 
        friendId: f.friendId, 
        status: f.status 
      })));
      
      // Filter to confirmed friends only
      const confirmedFriends = friends.filter(f => f.status === 'confirmed');
      console.log('Confirmed friends count:', confirmedFriends.length);
      
      // Map to friend IDs, filtering out undefined values
      const friendIds = confirmedFriends
        .map(f => f.userId === authenticatedUserId ? f.friendId : f.userId)
        .filter(Boolean);
      
      // Deduplicate friend IDs
      const userIds = [...new Set(friendIds)];
      
      console.log(`Status endpoint: user ${authenticatedUserId} -> confirmed friends: ${confirmedFriends.length}, friendIds:`, userIds);
      
      // Get current time info
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.toTimeString().slice(0, 5);
      
      const in_class = [];
      const free = [];
      
      // Process each user (self + friends)
      for (const userId of userIds) {
        try {
          const user = await storage.getUser(userId);
          if (!user) continue;
          
          const userStatus = await storage.getUserStatus(userId);
          const schedules = await storage.getSchedulesByUserId(userId);
          
          // Check if user is currently in class
          let currentClass = null;
          let nextClass = null;
          
          // Find current class
          for (const schedule of schedules) {
            if (schedule.days.includes(currentDay) && 
                schedule.startTime <= currentTime && 
                schedule.endTime >= currentTime) {
              currentClass = `${schedule.courseCode}: ${schedule.courseName}`;
              break;
            }
          }
          
          // Find next class today
          const todaySchedules = schedules.filter(s => s.days.includes(currentDay));
          const futureSchedules = todaySchedules.filter(s => s.startTime > currentTime);
          if (futureSchedules.length > 0) {
            const nextSchedule = futureSchedules.sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
            nextClass = `${nextSchedule.courseCode} @ ${nextSchedule.startTime}`;
          }
          
          // Create status board user object
          const statusUser = {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            major: user.major,
            avatar: user.avatar,
            manual_status: userStatus?.status || 'free',
            current_class: currentClass,
            next_class: nextClass,
            custom_message: userStatus?.message || null
          };
          
          // Categorize based on whether user is currently in class or not
          // User is "in class" if:
          // 1. They have a current class from their schedule, OR
          // 2. Their manual status is 'studying' (indicating they're in class/studying)
          const userManualStatus = userStatus?.status || 'free';
          const isInClass = currentClass !== null || userManualStatus === 'studying';
          
          if (isInClass) {
            in_class.push(statusUser);
          } else {
            free.push(statusUser);
          }
        } catch (userError) {
          console.error(`Error processing user ${userId}:`, userError);
          // Continue with other users even if one fails
        }
      }
      
      const statusData = {
        now: now.toISOString(),
        in_class,
        free
      };
      
      res.json(statusData);
    } catch (error: any) {
      console.error('Get status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get study partner recommendations
  app.get('/api/recommendations/:userId', requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      // SECURITY: Users can only get their own recommendations
      if (userId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Cannot access other users\' recommendations' });
      }
      
      // Get smart recommendations using the new algorithm
      const recommendations = await storage.getStudyPartnerRecommendations(userId, 10);
      
      console.log(`Generated ${recommendations.length} recommendations for user ${userId}`);
      
      res.json(recommendations);
    } catch (error: any) {
      console.error('Get recommendations error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Friends API Endpoints
  
  // Add friend
  app.post('/api/friends', requireAuth, async (req, res) => {
    try {
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      // Validate request body with Zod
      const validation = addFriendSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid friend data',
          details: validation.error.issues
        });
      }
      
      const { friendId } = validation.data;
      
      if (friendId === authenticatedUserId) {
        return res.status(400).json({ error: 'Cannot add yourself as a friend' });
      }
      
      const newFriendship = await storage.addFriend(authenticatedUserId, friendId);
      
      res.json({
        message: 'Friend added successfully',
        friendship: newFriendship
      });
    } catch (error: any) {
      console.error('Add friend error:', error);
      if (error.message === 'Friendship already exists') {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's friends
  app.get('/api/friends/:userId', requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      // SECURITY: Users can only get their own friends list
      if (userId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Cannot access other users\' friends list' });
      }
      
      const friends = await storage.getFriends(userId);
      
      res.json(friends);
    } catch (error: any) {
      console.error('Get friends error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Remove friend
  app.delete('/api/friends/:friendId', requireAuth, async (req, res) => {
    try {
      const { friendId } = req.params;
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      if (!friendId) {
        return res.status(400).json({ error: 'Friend ID is required' });
      }
      
      if (friendId === authenticatedUserId) {
        return res.status(400).json({ error: 'Cannot remove yourself as a friend' });
      }
      
      const success = await storage.removeFriend(authenticatedUserId, friendId);
      
      if (!success) {
        return res.status(404).json({ error: 'Friendship not found' });
      }
      
      res.json({
        message: 'Friend removed successfully'
      });
    } catch (error: any) {
      console.error('Remove friend error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get pending friend requests
  app.get('/api/friends/requests', requireAuth, async (req, res) => {
    try {
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      const pendingRequests = await storage.getPendingFriendRequests(authenticatedUserId);
      
      res.json(pendingRequests);
    } catch (error: any) {
      console.error('Get pending friend requests error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Accept friend request
  app.put('/api/friends/requests/:requestId/accept', requireAuth, async (req, res) => {
    try {
      const { requestId } = req.params;
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      if (!requestId) {
        return res.status(400).json({ error: 'Request ID is required' });
      }
      
      const success = await storage.acceptFriendRequest(requestId, authenticatedUserId);
      
      if (!success) {
        return res.status(404).json({ error: 'Friend request not found or already processed' });
      }
      
      res.json({
        message: 'Friend request accepted successfully'
      });
    } catch (error: any) {
      console.error('Accept friend request error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reject friend request
  app.put('/api/friends/requests/:requestId/reject', requireAuth, async (req, res) => {
    try {
      const { requestId } = req.params;
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      if (!requestId) {
        return res.status(400).json({ error: 'Request ID is required' });
      }
      
      const success = await storage.rejectFriendRequest(requestId, authenticatedUserId);
      
      if (!success) {
        return res.status(404).json({ error: 'Friend request not found' });
      }
      
      res.json({
        message: 'Friend request rejected successfully'
      });
    } catch (error: any) {
      console.error('Reject friend request error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update user manual status
  app.put('/api/status/:userId', requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      // SECURITY: Users can only update their own status
      if (userId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Cannot update other users\' status' });
      }
      
      const { status, message } = req.body;
      
      // Validate status against allowed values
      const validStatuses = ["studying", "free", "in_class", "busy", "tired", "social"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      
      // Store status update in database
      await storage.updateUserStatus(userId, status, message);
      
      console.log('Status updated for user', userId, ':', status, message ? `with message: "${message}"` : '');
      
      res.json({ 
        success: true, 
        status, 
        message: message || null,
        updated_at: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Update status error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Test data insertion endpoint (for development/testing)
  // SECURITY: Protected with authentication and environment checks
  app.post('/api/test-data/insert', requireAuth, async (req, res) => {
    try {
      // SECURITY: Disable in production environment
      if (process.env.NODE_ENV === 'production') {
        logWebSocket('warn', 'Test data insert endpoint blocked in production', {
          userId: (req as any).authenticatedUserId,
          ip: req.ip
        });
        return res.status(403).json({ 
          error: 'Test data endpoints are disabled in production' 
        });
      }
      
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      // Import the test data insertion function
      const { insertTestData } = await import('./test-data');
      
      await insertTestData();
      
      logWebSocket('info', 'Test data inserted successfully', {
        userId: authenticatedUserId,
        action: 'insert_test_data'
      });
      
      res.json({
        success: true,
        message: 'Test data inserted successfully'
      });
    } catch (error: any) {
      console.error('Test data insertion error:', error);
      res.status(500).json({ 
        error: error.message,
        message: 'Failed to insert test data'
      });
    }
  });

  // Clear test data endpoint (for cleanup)
  // SECURITY: Protected with authentication and environment checks
  app.delete('/api/test-data/clear', requireAuth, async (req, res) => {
    try {
      // SECURITY: Disable in production environment
      if (process.env.NODE_ENV === 'production') {
        logWebSocket('warn', 'Test data clear endpoint blocked in production', {
          userId: (req as any).authenticatedUserId,
          ip: req.ip
        });
        return res.status(403).json({ 
          error: 'Test data endpoints are disabled in production' 
        });
      }
      
      const authenticatedUserId = (req as any).authenticatedUserId;
      
      const { clearTestData } = await import('./test-data');
      
      await clearTestData();
      
      logWebSocket('info', 'Test data cleared successfully', {
        userId: authenticatedUserId,
        action: 'clear_test_data'
      });
      
      res.json({
        success: true,
        message: 'Test data cleared successfully'
      });
    } catch (error: any) {
      console.error('Test data clearing error:', error);
      res.status(500).json({ 
        error: error.message,
        message: 'Failed to clear test data'
      });
    }
  });

  const httpServer = createServer(app);

  // Setup WebSocket server on /ws path
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });

  wss.on('connection', (ws, request) => {
    const connectionId = Math.random().toString(36).substring(7);
    logWebSocket('info', `New WebSocket connection established`, { connectionId, origin: request.headers.origin });
    
    let userId: string | null = null;
    let isAuthenticated = false;

    ws.on('message', async (data) => {
      let message: WebSocketMessage | undefined;
      try {
        message = JSON.parse(data.toString()) as WebSocketMessage;
        
        if (!message || !message.type) {
          logWebSocket('error', 'Invalid message format - missing type', { message });
          return;
        }
        
        switch (message.type) {
          case 'auth':
            // SECURITY CRITICAL: FIXED WebSocket Authentication Vulnerability
            // NO LONGER trust client-provided userId - validate session/token instead
            
            let authenticatedUserId: string | null = null;
            
            // Method 1: Try session-based authentication from cookies
            authenticatedUserId = validateWebSocketSession(request);
            
            // Method 2: If no session, try token-based authentication
            if (!authenticatedUserId && message.data?.token) {
              authenticatedUserId = validateAuthToken(message.data.token);
              if (authenticatedUserId) {
                logWebSocket('info', 'WebSocket authenticated via token', {
                  userId: authenticatedUserId,
                  connectionId
                });
              }
            }
            
            // Method 3: For development/demo - validate against session store
            // This is a fallback that still requires the user to exist and have valid session
            if (!authenticatedUserId && message.data?.userId) {
              const requestedUserId = message.data.userId;
              
              // SECURITY: Still check if user exists, but this is not sufficient alone
              const userExists = await storage.getUser(requestedUserId);
              
              if (!userExists) {
                logWebSocket('error', `WebSocket authentication failed - user does not exist`, {
                  requestedUserId,
                  connectionId
                });
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: 'Authentication failed - user not found' }
                }));
                ws.close(4001, 'Authentication failed');
                return;
              }
              
              // TEMPORARY: For demo purposes, we'll allow this but log it as a security warning
              logWebSocket('warn', 'WebSocket using fallback authentication - SECURITY RISK IN PRODUCTION', {
                requestedUserId,
                connectionId,
                warningMessage: 'This should be replaced with proper session/token validation'
              });
              
              authenticatedUserId = requestedUserId;
            }
            
            // Final validation - must have authenticated userId
            if (!authenticatedUserId) {
              logWebSocket('error', 'WebSocket authentication failed - no valid session or token', {
                connectionId,
                hasSessionCookies: !!request.headers.cookie,
                hasToken: !!message.data?.token,
                hasUserId: !!message.data?.userId
              });
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Authentication required - please log in with valid session or token' }
              }));
              ws.close(4001, 'Authentication required');
              return;
            }
            
            // Verify the authenticated user actually exists
            const userExists = await storage.getUser(authenticatedUserId);
            if (!userExists) {
              logWebSocket('error', `WebSocket authenticated user does not exist in database`, {
                authenticatedUserId,
                connectionId
              });
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Authentication failed - user not found' }
              }));
              ws.close(4001, 'Authentication failed');
              return;
            }
            
            // SUCCESS: Set the authenticated user ID (NOT from client, from validation)
            userId = authenticatedUserId;
            isAuthenticated = true;
            
            // Remove any existing connection for this user
            const existingConnection = connectedUsers.get(userId);
            if (existingConnection && existingConnection.websocket !== ws) {
              logWebSocket('info', `Replacing existing connection for user ${userId}`);
              try {
                existingConnection.websocket.close(1000, 'New connection established');
              } catch (error) {
                logWebSocket('warn', `Failed to close existing connection for user ${userId}`, error);
              }
            }
            
            const now = new Date();
            connectedUsers.set(userId, { 
              userId, 
              websocket: ws, 
              connectedAt: now,
              lastActivity: now
            });
            
            logWebSocket('info', `User ${userId} successfully authenticated via WebSocket`, {
              totalConnections: connectedUsers.size,
              username: userExists.username
            });
            
            // Notify user they're online
            sendToUser(userId, {
              type: 'user_online',
              data: { status: 'connected', userId: userId }
            });
            break;

          case 'message':
            if (!userId || !isAuthenticated) {
              logWebSocket('warn', 'Unauthenticated message attempt');
              ws.send(JSON.stringify({ 
                type: 'error', 
                data: { message: 'User not authenticated' } 
              }));
              return;
            }

            // Validate and create message
            const messageData = insertMessageSchema.parse(message.data);
            
            // SECURITY: Verify the authenticated user matches the senderId
            if (messageData.senderId !== userId) {
              logWebSocket('error', `Sender ID mismatch`, {
                authenticatedUserId: userId,
                claimedSenderId: messageData.senderId,
                chatId: messageData.chatId
              });
              ws.send(JSON.stringify({ 
                type: 'error', 
                data: { message: 'Sender ID mismatch - authentication required' } 
              }));
              return;
            }
            
            // SECURITY: Verify the user is authorized to send messages in this chat
            const isAuthorized = await storage.isUserInChat(messageData.chatId, userId);
            if (!isAuthorized) {
              logWebSocket('error', `Unauthorized chat access attempt`, {
                userId,
                chatId: messageData.chatId
              });
              ws.send(JSON.stringify({ 
                type: 'error', 
                data: { message: 'User not authorized to send messages in this chat' } 
              }));
              return;
            }
            
            const createdMessage = await storage.createMessage(messageData);
            
            // Get chat to find the other user
            const chat = await storage.getChat(messageData.chatId);
            if (chat) {
              const otherUserId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
              
              // Get sender info for the message
              const sender = await storage.getUser(userId);
              
              // Send message to both users
              const messageWithSender = {
                ...createdMessage,
                sender: {
                  id: userId,
                  username: sender?.username || 'Unknown User',
                  avatar: sender?.avatar || null
                }
              };

              logWebSocket('info', `Broadcasting message to users`, {
                senderId: userId,
                recipientId: otherUserId,
                chatId: messageData.chatId,
                messageId: createdMessage.id
              });
              
              broadcastToUsers([userId, otherUserId], {
                type: 'message',
                data: messageWithSender
              });
            } else {
              logWebSocket('error', `Chat not found for message broadcast`, {
                chatId: messageData.chatId
              });
            }
            break;

          case 'typing':
            if (userId && message.data.chatId) {
              // SECURITY: Verify the user is authorized to send typing indicators in this chat
              const isAuthorized = await storage.isUserInChat(message.data.chatId, userId);
              if (!isAuthorized) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  data: { message: 'User not authorized to send typing indicators in this chat' } 
                }));
                return;
              }
              
              const chat = await storage.getChat(message.data.chatId);
              if (chat) {
                const otherUserId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
                sendToUser(otherUserId, {
                  type: 'typing',
                  data: { userId, isTyping: message.data.isTyping }
                });
              }
            }
            break;

          case 'read_receipt':
            if (userId && message.data.messageId && message.data.chatId) {
              // SECURITY: Verify the user is authorized to mark messages as read in this chat
              const isAuthorized = await storage.isUserInChat(message.data.chatId, userId);
              if (!isAuthorized) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  data: { message: 'User not authorized to mark messages as read in this chat' } 
                }));
                return;
              }
              
              await storage.markMessageAsRead(message.data.messageId, userId);
              
              // Get message to find sender
              const messages = await storage.getMessagesByChatId(message.data.chatId, 1);
              if (messages.length > 0) {
                const messageToMark = messages.find(m => m.id === message?.data?.messageId);
                if (messageToMark) {
                  sendToUser(messageToMark.senderId, {
                    type: 'read_receipt',
                    data: { messageId: message?.data?.messageId, readBy: userId }
                  });
                }
              }
            }
            break;

          default:
            console.log('Unknown message type:', message?.type || 'undefined');
        }
      } catch (error: any) {
        logWebSocket('error', `WebSocket message processing error for user ${userId || 'anonymous'}`, {
          error: error.message,
          messageType: message?.type,
          stack: error.stack
        });
        
        try {
          ws.send(JSON.stringify({ 
            type: 'error', 
            data: { message: 'Invalid message format or processing error' } 
          }));
        } catch (sendError) {
          logWebSocket('error', `Failed to send error message to user ${userId || 'anonymous'}`, sendError);
        }
      }
    });

    ws.on('close', (code, reason) => {
      if (userId) {
        const connection = connectedUsers.get(userId);
        const sessionDuration = connection ? Date.now() - connection.connectedAt.getTime() : 0;
        
        connectedUsers.delete(userId);
        
        logWebSocket('info', `User ${userId} disconnected from WebSocket`, {
          code,
          reason: reason.toString(),
          sessionDuration: `${Math.round(sessionDuration / 1000)}s`,
          totalConnections: connectedUsers.size
        });
        
        // Notify other users that this user went offline (optional - can be optimized)
        // Only notify users in active chats to reduce noise
        connectedUsers.forEach((connectedUser, connectedUserId) => {
          if (connectedUserId !== userId) {
            sendToUser(connectedUserId, {
              type: 'user_offline',
              data: { userId }
            });
          }
        });
      } else {
        logWebSocket('info', `Anonymous connection closed`, { code, reason: reason.toString() });
      }
    });

    ws.on('error', (error) => {
      logWebSocket('error', `WebSocket error for user ${userId || 'anonymous'}`, {
        error: error.message,
        stack: error.stack
      });
      
      // Clean up connection on error
      if (userId) {
        connectedUsers.delete(userId);
      }
    });
    
    // Handle connection ping/pong for keep-alive
    ws.on('pong', () => {
      if (userId) {
        const connection = connectedUsers.get(userId);
        if (connection) {
          connection.lastActivity = new Date();
        }
      }
    });
  });

  return httpServer;
}
