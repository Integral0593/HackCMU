import { 
  type User, 
  type InsertUser, 
  type Schedule, 
  type InsertSchedule,
  type Chat,
  type InsertChat,
  type Message,
  type InsertMessage,
  type Friend,
  type InsertFriend,
  type MessageNotification,
  type InsertMessageNotification,
  type MessageNotificationWithSender,
  type ChatWithLastMessage,
  type MessageWithSender,
  type RegisterUser,
  type LoginUser,
  type PublicUser,
  type SearchUser,
  type FriendWithUser,
  type StudyPartner,
  users,
  schedules,
  chats,
  messages,
  friends,
  userStatus,
  messageNotifications
} from "@shared/schema";
import { eq, and, or, desc, asc, isNull, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<Omit<InsertUser, 'password'>>): Promise<User | undefined>;
  
  // Authentication methods
  registerUser(data: RegisterUser): Promise<PublicUser>;
  authenticateUser(username: string, password: string): Promise<PublicUser | null>;
  getUserById(id: string): Promise<PublicUser | undefined>;
  
  // Schedule methods
  getSchedulesByUserId(userId: string): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule, userId: string): Promise<Schedule>;
  deleteSchedule(scheduleId: string, userId: string): Promise<boolean>;
  createMultipleSchedules(schedules: InsertSchedule[], userId: string): Promise<Schedule[]>;
  
  // Chat methods
  createChat(chat: InsertChat): Promise<Chat>;
  getChat(chatId: string): Promise<Chat | undefined>;
  getChatBetweenUsers(user1Id: string, user2Id: string): Promise<Chat | undefined>;
  getChatsByUserId(userId: string): Promise<ChatWithLastMessage[]>;
  updateChatLastMessage(chatId: string): Promise<void>;
  isUserInChat(chatId: string, userId: string): Promise<boolean>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByChatId(chatId: string, limit?: number, offset?: number): Promise<MessageWithSender[]>;
  markMessageAsRead(messageId: string, userId: string): Promise<boolean>;
  getUnreadMessagesCount(chatId: string, userId: string): Promise<number>;
  
  // Friends methods
  searchUsers(query: string, currentUserId: string, limit?: number): Promise<SearchUser[]>;
  addFriend(userId: string, friendId: string): Promise<Friend>;
  removeFriend(userId: string, friendId: string): Promise<boolean>;
  getFriends(userId: string): Promise<FriendWithUser[]>;
  getFriendsByUserId(userId: string): Promise<Friend[]>;
  areFriends(userId: string, friendId: string): Promise<boolean>;
  acceptFriendRequest(requestId: string, authenticatedUserId: string): Promise<boolean>;
  rejectFriendRequest(requestId: string, authenticatedUserId: string): Promise<boolean>;
  getPendingFriendRequests(userId: string): Promise<PendingFriendRequest[]>;
  getUserStatus(userId: string): Promise<{ status: string; message?: string | null } | null>;
  updateUserStatus(userId: string, status: string, message?: string): Promise<void>;
  
  // Recommendation methods
  getStudyPartnerRecommendations(userId: string, limit?: number): Promise<StudyPartner[]>;
  
  // Message notification methods
  createMessageNotification(notification: InsertMessageNotification): Promise<MessageNotification>;
  getMessageNotificationsByUserId(userId: string, limit?: number): Promise<MessageNotificationWithSender[]>;
  markMessageNotificationAsRead(notificationId: string, userId: string): Promise<boolean>;
  markAllMessageNotificationsAsRead(userId: string): Promise<number>;
  getUnreadMessageNotificationsCount(userId: string): Promise<number>;
  deleteMessageNotification(notificationId: string, userId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private schedules: Map<string, Schedule>;
  private chats: Map<string, Chat>;
  private messages: Map<string, Message>;
  private friends: Map<string, Friend>;
  private userStatuses: Map<string, any>;
  private messageNotifications: Map<string, MessageNotification>;

  constructor() {
    this.users = new Map();
    this.schedules = new Map();
    this.chats = new Map();
    this.messages = new Map();
    this.friends = new Map();
    this.userStatuses = new Map();
    this.messageNotifications = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      fullName: insertUser.fullName ?? null, // Handle undefined by converting to null
      avatar: insertUser.avatar ?? null, // Handle undefined by converting to null
      dorm: insertUser.dorm ?? null,
      college: insertUser.college ?? null,
      gender: insertUser.gender ?? null,
      bio: insertUser.bio ?? null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updateData: Partial<Omit<InsertUser, 'password'>>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    // SECURITY: Explicitly reject any password field in update data
    if ('password' in updateData) {
      throw new Error('Password updates are not allowed through this method. Use a dedicated password change endpoint.');
    }
    
    const updatedUser: User = {
      ...existingUser,
      ...updateData,
      // Handle optional fields with proper null support for clearing
      fullName: updateData.hasOwnProperty('fullName') ? (updateData.fullName ?? null) : existingUser.fullName,
      avatar: updateData.hasOwnProperty('avatar') ? (updateData.avatar ?? null) : existingUser.avatar,
      dorm: updateData.hasOwnProperty('dorm') ? (updateData.dorm ?? null) : existingUser.dorm,
      college: updateData.hasOwnProperty('college') ? (updateData.college ?? null) : existingUser.college,
      gender: updateData.hasOwnProperty('gender') ? (updateData.gender ?? null) : existingUser.gender,
      bio: updateData.hasOwnProperty('bio') ? (updateData.bio ?? null) : existingUser.bio
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getSchedulesByUserId(userId: string): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(
      (schedule) => schedule.userId === userId
    );
  }

  async createSchedule(insertSchedule: InsertSchedule, userId: string): Promise<Schedule> {
    const id = randomUUID();
    const schedule: Schedule = {
      ...insertSchedule,
      id,
      userId,
      location: insertSchedule.location ?? null // Handle undefined by converting to null
    };
    this.schedules.set(id, schedule);
    return schedule;
  }

  async deleteSchedule(scheduleId: string, userId: string): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (schedule && schedule.userId === userId) {
      this.schedules.delete(scheduleId);
      return true;
    }
    return false;
  }

  async createMultipleSchedules(insertSchedules: InsertSchedule[], userId: string): Promise<Schedule[]> {
    const schedules: Schedule[] = [];
    for (const insertSchedule of insertSchedules) {
      const id = randomUUID();
      const schedule: Schedule = {
        ...insertSchedule,
        id,
        userId,
        location: insertSchedule.location ?? null // Handle undefined by converting to null
      };
      this.schedules.set(id, schedule);
      schedules.push(schedule);
    }
    return schedules;
  }

  // Chat methods implementation
  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = randomUUID();
    const now = new Date();
    const chat: Chat = {
      ...insertChat,
      id,
      createdAt: now,
      lastMessageAt: now,
    };
    this.chats.set(id, chat);
    return chat;
  }

  async getChat(chatId: string): Promise<Chat | undefined> {
    return this.chats.get(chatId);
  }

  async getChatBetweenUsers(user1Id: string, user2Id: string): Promise<Chat | undefined> {
    return Array.from(this.chats.values()).find(
      (chat) => 
        (chat.user1Id === user1Id && chat.user2Id === user2Id) ||
        (chat.user1Id === user2Id && chat.user2Id === user1Id)
    );
  }

  async getChatsByUserId(userId: string): Promise<ChatWithLastMessage[]> {
    const userChats = Array.from(this.chats.values()).filter(
      (chat) => chat.user1Id === userId || chat.user2Id === userId
    );

    const chatsWithDetails: ChatWithLastMessage[] = [];
    
    for (const chat of userChats) {
      const otherUserId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
      const otherUser = this.users.get(otherUserId);
      
      if (!otherUser) continue;
      
      // Get last message for this chat
      const chatMessages = Array.from(this.messages.values())
        .filter(msg => msg.chatId === chat.id)
        .sort((a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime());
      
      const lastMessage = chatMessages[0];
      
      // Count unread messages
      const unreadCount = chatMessages.filter(
        msg => msg.senderId !== userId && !msg.readAt
      ).length;

      chatsWithDetails.push({
        ...chat,
        lastMessage,
        otherUser: {
          id: otherUser.id,
          username: otherUser.username,
          avatar: otherUser.avatar,
        },
        unreadCount,
      });
    }

    // Sort by last message time
    return chatsWithDetails.sort((a, b) => {
      const aTime = a.lastMessage?.sentAt || a.createdAt;
      const bTime = b.lastMessage?.sentAt || b.createdAt;
      return new Date(bTime!).getTime() - new Date(aTime!).getTime();
    });
  }

  async updateChatLastMessage(chatId: string): Promise<void> {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.lastMessageAt = new Date();
      this.chats.set(chatId, chat);
    }
  }

  // Message methods implementation
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const now = new Date();
    const message: Message = {
      ...insertMessage,
      id,
      sentAt: now,
      readAt: null,
    };
    this.messages.set(id, message);
    
    // Update chat's last message timestamp
    await this.updateChatLastMessage(insertMessage.chatId);
    
    return message;
  }

  async getMessagesByChatId(chatId: string, limit = 50, offset = 0): Promise<MessageWithSender[]> {
    const chatMessages = Array.from(this.messages.values())
      .filter(msg => msg.chatId === chatId)
      .sort((a, b) => new Date(a.sentAt!).getTime() - new Date(b.sentAt!).getTime())
      .slice(offset, offset + limit);

    const messagesWithSender: MessageWithSender[] = [];
    
    for (const message of chatMessages) {
      const sender = this.users.get(message.senderId);
      if (sender) {
        messagesWithSender.push({
          ...message,
          sender: {
            id: sender.id,
            username: sender.username,
            avatar: sender.avatar,
          },
        });
      }
    }
    
    return messagesWithSender;
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<boolean> {
    const message = this.messages.get(messageId);
    if (message && message.senderId !== userId && !message.readAt) {
      message.readAt = new Date();
      this.messages.set(messageId, message);
      return true;
    }
    return false;
  }

  async getUnreadMessagesCount(chatId: string, userId: string): Promise<number> {
    return Array.from(this.messages.values()).filter(
      msg => msg.chatId === chatId && msg.senderId !== userId && !msg.readAt
    ).length;
  }

  async isUserInChat(chatId: string, userId: string): Promise<boolean> {
    const chat = this.chats.get(chatId);
    return chat ? (chat.user1Id === userId || chat.user2Id === userId) : false;
  }

  // Authentication methods (stub implementations for MemStorage)
  async registerUser(data: RegisterUser): Promise<PublicUser> {
    const user = await this.createUser({
      username: data.username,
      password: data.password,
      major: data.major,
      avatar: null,
      dorm: null,
      college: null,
      gender: undefined,
      bio: null,
    });
    const { password, ...publicUser } = user;
    return publicUser as PublicUser;
  }

  async authenticateUser(username: string, password: string): Promise<PublicUser | null> {
    const user = await this.getUserByUsername(username);
    if (!user || user.password !== password) {
      return null;
    }
    const { password: _, ...publicUser } = user;
    return publicUser as PublicUser;
  }

  async getUserById(id: string): Promise<PublicUser | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    const { password, ...publicUser } = user;
    return publicUser as PublicUser;
  }

  // Friends methods implementation for MemStorage
  async searchUsers(query: string, currentUserId: string, limit = 20): Promise<SearchUser[]> {
    const queryLower = query.toLowerCase();
    const results: SearchUser[] = [];
    
    for (const user of Array.from(this.users.values())) {
      if (user.id === currentUserId) continue;
      
      // Search by username, fullName, or major
      if (user.username.toLowerCase().includes(queryLower) || 
          (user.fullName && user.fullName.toLowerCase().includes(queryLower)) ||
          user.major.toLowerCase().includes(queryLower)) {
        
        // Check if already friends
        const isFriend = await this.areFriends(currentUserId, user.id);
        
        // Get shared classes (stub - would need schedules comparison)
        const sharedClasses: string[] = [];
        
        results.push({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          major: user.major,
          dorm: user.dorm,
          college: user.college,
          bio: user.bio,
          avatar: user.avatar,
          isFriend,
          sharedClasses
        });
        
        if (results.length >= limit) break;
      }
    }
    
    return results;
  }

  async addFriend(userId: string, friendId: string): Promise<Friend> {
    // Check if already friends or pending request exists
    const existingFriendship = await this.areFriends(userId, friendId);
    if (existingFriendship) {
      throw new Error('Users are already friends');
    }
    
    // Check if pending request already exists
    const existingRequest = await this.getPendingFriendRequest(userId, friendId);
    if (existingRequest) {
      throw new Error('Friend request already pending');
    }
    
    const id = randomUUID();
    const now = new Date();
    const friend: Friend = {
      id,
      userId,
      friendId,
      createdAt: now,
      status: 'pending' // Changed from 'confirmed' to 'pending'
    };
    
    this.friends.set(id, friend);
    return friend;
  }

  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    for (const [id, friend] of Array.from(this.friends.entries())) {
      if ((friend.userId === userId && friend.friendId === friendId) ||
          (friend.userId === friendId && friend.friendId === userId)) {
        this.friends.delete(id);
        return true;
      }
    }
    return false;
  }

  async getFriends(userId: string): Promise<FriendWithUser[]> {
    const userFriends: FriendWithUser[] = [];
    
    for (const friend of Array.from(this.friends.values())) {
      let otherUserId: string | null = null;
      
      if (friend.userId === userId) {
        otherUserId = friend.friendId;
      } else if (friend.friendId === userId) {
        otherUserId = friend.userId;
      }
      
      if (otherUserId) {
        const otherUser = this.users.get(otherUserId);
        if (otherUser) {
          const { password, ...publicUser } = otherUser;
          userFriends.push({
            id: friend.id,
            userId: friend.userId,
            friendId: friend.friendId,
            createdAt: friend.createdAt,
            status: friend.status,
            friend: publicUser as PublicUser
          });
        }
      }
    }
    
    return userFriends;
  }

  async areFriends(userId: string, friendId: string): Promise<boolean> {
    for (const friend of Array.from(this.friends.values())) {
      if (((friend.userId === userId && friend.friendId === friendId) ||
          (friend.userId === friendId && friend.friendId === userId)) &&
          friend.status === 'confirmed') { // Only confirmed friendships count
        return true;
      }
    }
    return false;
  }

  // Helper method to check if a pending friend request exists
  async getPendingFriendRequest(fromUserId: string, toUserId: string): Promise<Friend | null> {
    for (const friend of Array.from(this.friends.values())) {
      if (friend.userId === fromUserId && friend.friendId === toUserId && friend.status === 'pending') {
        return friend;
      }
    }
    return null;
  }

  // Accept a friend request
  async acceptFriendRequest(requestId: string, authenticatedUserId: string): Promise<boolean> {
    const request = this.friends.get(requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    // Only the friend (recipient) can accept the request
    if (request.friendId !== authenticatedUserId) {
      return false;
    }

    // Update the request to confirmed
    request.status = 'confirmed';
    this.friends.set(requestId, request);

    // Create the reciprocal friendship
    const reciprocalId = randomUUID();
    const reciprocalFriendship: Friend = {
      id: reciprocalId,
      userId: request.friendId,
      friendId: request.userId,
      createdAt: new Date(),
      status: 'confirmed'
    };
    
    this.friends.set(reciprocalId, reciprocalFriendship);
    return true;
  }

  // Reject a friend request
  async rejectFriendRequest(requestId: string, authenticatedUserId: string): Promise<boolean> {
    const request = this.friends.get(requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    // Only the friend (recipient) can reject the request
    if (request.friendId !== authenticatedUserId) {
      return false;
    }

    // Remove the pending request
    this.friends.delete(requestId);
    return true;
  }

  // Get all pending friend requests for a user
  async getPendingFriendRequests(userId: string): Promise<PendingFriendRequest[]> {
    const pendingRequests: PendingFriendRequest[] = [];
    
    for (const friend of Array.from(this.friends.values())) {
      if (friend.friendId === userId && friend.status === 'pending') {
        const requester = await this.getUser(friend.userId);
        if (requester) {
          pendingRequests.push({
            ...friend,
            requester: {
              id: requester.id,
              username: requester.username,
              fullName: requester.fullName,
              major: requester.major,
              avatar: requester.avatar,
              dorm: requester.dorm,
              college: requester.college,
              bio: requester.bio,
              grade: requester.grade,
              hobbies: requester.hobbies
            }
          });
        }
      }
    }
    
    return pendingRequests;
  }

  async getFriendsByUserId(userId: string): Promise<Friend[]> {
    return Array.from(this.friends.values()).filter(friend => 
      friend.userId === userId || friend.friendId === userId
    );
  }

  async getUserStatus(userId: string): Promise<{ status: string; message?: string | null } | null> {
    const status = Array.from(this.userStatuses.values()).find((s: any) => s.userId === userId);
    if (!status) return null;
    return {
      status: status.manualStatus,
      message: status.message || null
    };
  }

  async updateUserStatus(userId: string, status: string, message?: string): Promise<void> {
    const statusId = randomUUID();
    const statusData = {
      id: statusId,
      userId,
      manualStatus: status,
      message: message || null,
      lastUpdated: new Date()
    };
    this.userStatuses.set(userId, statusData);
  }

  // Helper function to extract hobbies from bio text
  private extractHobbies(bio: string | null): string[] {
    if (!bio) return [];
    
    // Simple keyword extraction for hobbies/interests
    const hobbyKeywords = [
      'reading', 'gaming', 'music', 'sports', 'basketball', 'football', 'soccer', 
      'tennis', 'swimming', 'running', 'hiking', 'cooking', 'photography', 'art',
      'coding', 'programming', 'chess', 'guitar', 'piano', 'movies', 'travel',
      'dancing', 'singing', 'writing', 'drawing', 'cycling', 'yoga', 'gym',
      'anime', 'manga', 'books', 'science', 'research', 'technology', 'AI',
      'machine learning', 'data science'
    ];
    
    const bioLower = bio.toLowerCase();
    return hobbyKeywords.filter(hobby => bioLower.includes(hobby));
  }

  // Helper function to calculate major similarity score
  private calculateMajorSimilarity(major1: string, major2: string): number {
    if (major1 === major2) return 1.0;
    
    // Define major similarity groups
    const majorGroups = [
      ['computer science', 'cs', 'software engineering', 'mathematics', 'math', 'engineering', 'physics'],
      ['economics', 'business', 'finance', 'psychology', 'management', 'marketing'],
      ['english', 'art', 'history', 'philosophy', 'literature', 'languages', 'liberal arts'],
      ['biology', 'chemistry', 'medicine', 'pre-med', 'biochemistry', 'neuroscience'],
      ['political science', 'international relations', 'law', 'public policy']
    ];
    
    const major1Lower = major1.toLowerCase();
    const major2Lower = major2.toLowerCase();
    
    // Find which groups each major belongs to
    let group1 = -1, group2 = -1;
    
    for (let i = 0; i < majorGroups.length; i++) {
      if (majorGroups[i].some(m => major1Lower.includes(m))) group1 = i;
      if (majorGroups[i].some(m => major2Lower.includes(m))) group2 = i;
    }
    
    // Calculate similarity based on group membership
    if (group1 === group2 && group1 !== -1) return 0.8; // Same group
    if (group1 !== -1 && group2 !== -1) return 0.3; // Different groups
    return 0.1; // No group match
  }

  // Smart recommendation algorithm implementation
  async getStudyPartnerRecommendations(userId: string, limit = 10): Promise<StudyPartner[]> {
    try {
      // Import the new match algorithm
      const { getStudyPartners } = await import('./matchAlgorithm');
      
      console.log(`[MemStorage] Using new match algorithm for user ${userId}`);
      
      // Prepare snapshot data structure for MemStorage
      const currentUser = this.users.get(userId);
      if (!currentUser) return [];

      // Build users map
      const usersMap = new Map();
      for (const [id, user] of this.users.entries()) {
        usersMap.set(id, user);
      }

      // Build schedules map
      const schedulesMap = new Map();
      for (const [id] of this.users.entries()) {
        const userSchedules = Array.from(this.schedules.values()).filter(
          schedule => schedule.userId === id
        );
        schedulesMap.set(id, userSchedules);
      }

      // Build statuses map  
      const statusesMap = new Map();
      for (const [id] of this.users.entries()) {
        const userStatus = this.userStatuses.get(id);
        statusesMap.set(id, userStatus || { status: 'free', message: null });
      }

      // Prepare snapshot
      const snapshot = {
        users: usersMap,
        schedules: schedulesMap,
        statuses: statusesMap
      };

      // Call the new algorithm
      const recommendations = await getStudyPartners(snapshot, userId, new Date(), limit);
      
      // Filter out friends from recommendations
      const filteredRecommendations = [];
      for (const rec of recommendations) {
        const areFriends = await this.areFriends(userId, rec.id);
        if (!areFriends) {
          filteredRecommendations.push(rec);
        }
      }

      console.log(`[MemStorage] Generated ${filteredRecommendations.length} recommendations using new algorithm for user ${userId}`);
      return filteredRecommendations;

    } catch (error) {
      console.error('[MemStorage] Error in getStudyPartnerRecommendations:', error);
      return [];
    }
  }
}

export class PostgreSQLStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updateData: Partial<Omit<InsertUser, 'password'>>): Promise<User | undefined> {
    // SECURITY: Explicitly reject any password field in update data
    if ('password' in updateData) {
      throw new Error('Password updates are not allowed through this method. Use a dedicated password change endpoint.');
    }
    
    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Authentication methods
  async registerUser(data: RegisterUser): Promise<PublicUser> {
    // Check if username already exists
    const existingUser = await this.getUserByUsername(data.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    // Create user
    const insertData: InsertUser = {
      username: data.username,
      password: hashedPassword,
      fullName: data.fullName || null,
      major: data.major,
      avatar: null,
      dorm: null,
      college: null,
      gender: undefined,
      bio: null,
    };

    const result = await db.insert(users).values(insertData).returning();
    const user = result[0];

    // Return user without password
    const { password, ...publicUser } = user;
    return publicUser as PublicUser;
  }

  async authenticateUser(username: string, password: string): Promise<PublicUser | null> {
    // Get user by username
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Return user without password
    const { password: _, ...publicUser } = user;
    return publicUser as PublicUser;
  }

  async getUserById(id: string): Promise<PublicUser | undefined> {
    const user = await this.getUser(id);
    if (!user) {
      return undefined;
    }

    // Return user without password
    const { password, ...publicUser } = user;
    return publicUser as PublicUser;
  }

  // Schedule methods
  async getSchedulesByUserId(userId: string): Promise<Schedule[]> {
    return await db.select().from(schedules).where(eq(schedules.userId, userId));
  }

  async createSchedule(insertSchedule: InsertSchedule, userId: string): Promise<Schedule> {
    const result = await db.insert(schedules).values({
      ...insertSchedule,
      userId
    }).returning();
    return result[0];
  }

  async deleteSchedule(scheduleId: string, userId: string): Promise<boolean> {
    const result = await db.delete(schedules)
      .where(and(eq(schedules.id, scheduleId), eq(schedules.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async createMultipleSchedules(insertSchedules: InsertSchedule[], userId: string): Promise<Schedule[]> {
    const schedulesToInsert = insertSchedules.map(schedule => ({
      ...schedule,
      userId
    }));
    
    return await db.insert(schedules).values(schedulesToInsert).returning();
  }

  // Chat methods
  async createChat(insertChat: InsertChat): Promise<Chat> {
    const result = await db.insert(chats).values(insertChat).returning();
    return result[0];
  }

  async getChat(chatId: string): Promise<Chat | undefined> {
    const result = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
    return result[0];
  }

  async getChatBetweenUsers(user1Id: string, user2Id: string): Promise<Chat | undefined> {
    const result = await db.select().from(chats).where(
      or(
        and(eq(chats.user1Id, user1Id), eq(chats.user2Id, user2Id)),
        and(eq(chats.user1Id, user2Id), eq(chats.user2Id, user1Id))
      )
    ).limit(1);
    return result[0];
  }

  async getChatsByUserId(userId: string): Promise<ChatWithLastMessage[]> {
    // Get all chats for the user
    const userChats = await db.select().from(chats).where(
      or(eq(chats.user1Id, userId), eq(chats.user2Id, userId))
    );

    const chatsWithDetails: ChatWithLastMessage[] = [];
    
    for (const chat of userChats) {
      const otherUserId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
      
      // Get other user info
      const otherUser = await db.select({
        id: users.id,
        username: users.username,
        avatar: users.avatar
      }).from(users).where(eq(users.id, otherUserId)).limit(1);
      
      if (otherUser.length === 0) continue;
      
      // Get last message for this chat
      const lastMessage = await db.select().from(messages)
        .where(eq(messages.chatId, chat.id))
        .orderBy(desc(messages.sentAt))
        .limit(1);
      
      // Count unread messages
      const unreadCountResult = await db.select().from(messages)
        .where(
          and(
            eq(messages.chatId, chat.id),
            eq(messages.senderId, otherUserId), // Messages from other user
            isNull(messages.readAt) // Not read
          )
        );
      
      chatsWithDetails.push({
        ...chat,
        lastMessage: lastMessage[0],
        otherUser: otherUser[0],
        unreadCount: unreadCountResult.length,
      });
    }

    // Sort by last message time
    return chatsWithDetails.sort((a, b) => {
      const aTime = a.lastMessage?.sentAt || a.createdAt;
      const bTime = b.lastMessage?.sentAt || b.createdAt;
      return new Date(bTime!).getTime() - new Date(aTime!).getTime();
    });
  }

  async updateChatLastMessage(chatId: string): Promise<void> {
    await db.update(chats)
      .set({ lastMessageAt: new Date() })
      .where(eq(chats.id, chatId));
  }

  async isUserInChat(chatId: string, userId: string): Promise<boolean> {
    const result = await db.select().from(chats).where(
      and(
        eq(chats.id, chatId),
        or(eq(chats.user1Id, userId), eq(chats.user2Id, userId))
      )
    ).limit(1);
    return result.length > 0;
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(insertMessage).returning();
    
    // Update chat's last message timestamp
    await this.updateChatLastMessage(insertMessage.chatId);
    
    return result[0];
  }

  async getMessagesByChatId(chatId: string, limit = 50, offset = 0): Promise<MessageWithSender[]> {
    const messagesWithSender = await db.select({
      id: messages.id,
      chatId: messages.chatId,
      senderId: messages.senderId,
      content: messages.content,
      messageType: messages.messageType,
      sentAt: messages.sentAt,
      readAt: messages.readAt,
      sender: {
        id: users.id,
        username: users.username,
        avatar: users.avatar
      }
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.sentAt))
    .limit(limit)
    .offset(offset);

    return messagesWithSender;
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<boolean> {
    // Only allow marking messages as read if the user is not the sender and message is not already read
    const result = await db.update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.id, messageId),
          // Note: We don't check senderId here because we want to allow marking any message as read
          // The business logic should handle this in the API layer
        )
      )
      .returning();
    
    return result.length > 0;
  }

  async getUnreadMessagesCount(chatId: string, userId: string): Promise<number> {
    const result = await db.select().from(messages).where(
      and(
        eq(messages.chatId, chatId),
        // Messages from other users (not from current user)
        // We'll need to check this at the API level or join with chat to get other user
        isNull(messages.readAt)
      )
    );
    
    // Filter out messages from the current user
    return result.filter(msg => msg.senderId !== userId).length;
  }

  // Friends methods implementation
  async searchUsers(query: string, currentUserId: string, limit = 10): Promise<SearchUser[]> {
    const searchResults = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      major: users.major,
      avatar: users.avatar,
      dorm: users.dorm,
      college: users.college,
      bio: users.bio
    })
    .from(users)
    .where(
      and(
        // Exclude current user
        // Use proper SQL function for ILIKE - search username, fullName, and major
        sql`LOWER(${users.username}) LIKE ${'%' + query.toLowerCase() + '%'} OR LOWER(${users.fullName}) LIKE ${'%' + query.toLowerCase() + '%'} OR LOWER(${users.major}) LIKE ${'%' + query.toLowerCase() + '%'}`,
        sql`${users.id} != ${currentUserId}`
      )
    )
    .limit(limit);

    // For each user, check if they're already a friend and get shared classes
    const searchUsersWithDetails: SearchUser[] = [];
    
    for (const user of searchResults) {
      // Check if they're already friends
      const isFriend = await this.areFriends(currentUserId, user.id);
      
      // Get shared classes (simplified for now)
      const currentUserSchedules = await db.select().from(schedules).where(eq(schedules.userId, currentUserId));
      const otherUserSchedules = await db.select().from(schedules).where(eq(schedules.userId, user.id));
      
      const sharedClasses = currentUserSchedules
        .filter(current => otherUserSchedules.some(other => other.courseCode === current.courseCode))
        .map(schedule => schedule.courseCode);

      searchUsersWithDetails.push({
        ...user,
        isFriend,
        sharedClasses
      });
    }

    return searchUsersWithDetails;
  }

  async addFriend(userId: string, friendId: string): Promise<Friend> {
    // Check if friendship already exists
    const existingFriendship = await db.select().from(friends).where(
      or(
        and(eq(friends.userId, userId), eq(friends.friendId, friendId)),
        and(eq(friends.userId, friendId), eq(friends.friendId, userId))
      )
    );

    if (existingFriendship.length > 0) {
      throw new Error('Friendship already exists');
    }

    // Create the friendship
    const [newFriendship] = await db.insert(friends)
      .values({
        userId,
        friendId,
        status: 'confirmed'
      })
      .returning();

    return newFriendship;
  }

  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const result = await db.delete(friends).where(
      or(
        and(eq(friends.userId, userId), eq(friends.friendId, friendId)),
        and(eq(friends.userId, friendId), eq(friends.friendId, userId))
      )
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getFriends(userId: string): Promise<FriendWithUser[]> {
    const userFriends = await db.select({
      id: friends.id,
      userId: friends.userId,
      friendId: friends.friendId,
      createdAt: friends.createdAt,
      status: friends.status,
      friend: {
        id: users.id,
        username: users.username,
        major: users.major,
        avatar: users.avatar,
        dorm: users.dorm,
        college: users.college,
        bio: users.bio
      }
    })
    .from(friends)
    .innerJoin(users, 
      or(
        // If current user is userId, get friendId's details
        and(eq(friends.userId, userId), eq(users.id, friends.friendId)),
        // If current user is friendId, get userId's details
        and(eq(friends.friendId, userId), eq(users.id, friends.userId))
      )
    )
    .where(
      or(
        eq(friends.userId, userId),
        eq(friends.friendId, userId)
      )
    );

    return userFriends;
  }

  async getFriendsByUserId(userId: string): Promise<Friend[]> {
    const result = await db.select().from(friends).where(
      or(
        eq(friends.userId, userId),
        eq(friends.friendId, userId)
      )
    );
    return result;
  }

  async getUserStatus(userId: string): Promise<{ status: string; message?: string | null } | null> {
    const result = await db.select().from(userStatus).where(eq(userStatus.userId, userId)).limit(1);
    if (result.length === 0) {
      return null;
    }
    return {
      status: result[0].manualStatus,
      message: result[0].message
    };
  }

  async updateUserStatus(userId: string, status: string, message?: string): Promise<void> {
    // Check if user status record exists
    const existing = await db.select().from(userStatus).where(eq(userStatus.userId, userId)).limit(1);
    
    if (existing.length > 0) {
      // Update existing record
      await db.update(userStatus)
        .set({ 
          manualStatus: status, 
          message: message || null, 
          lastUpdated: sql`now()` 
        })
        .where(eq(userStatus.userId, userId));
    } else {
      // Create new record
      await db.insert(userStatus)
        .values({
          userId,
          manualStatus: status,
          message: message || null
        });
    }
  }

  async areFriends(userId: string, friendId: string): Promise<boolean> {
    const result = await db.select().from(friends).where(
      or(
        and(eq(friends.userId, userId), eq(friends.friendId, friendId)),
        and(eq(friends.userId, friendId), eq(friends.friendId, userId))
      )
    );

    return result.length > 0;
  }

  // Accept a friend request (PostgreSQL implementation)
  async acceptFriendRequest(requestId: string, authenticatedUserId: string): Promise<boolean> {
    try {
      // Get the friend request
      const result = await db.select().from(friends).where(eq(friends.id, requestId)).limit(1);
      const request = result[0];
      
      if (!request || request.status !== 'pending') {
        return false;
      }

      // Only the friend (recipient) can accept the request
      if (request.friendId !== authenticatedUserId) {
        return false;
      }

      // Update the request to confirmed
      await db.update(friends)
        .set({ status: 'confirmed' })
        .where(eq(friends.id, requestId));

      // Create the reciprocal friendship
      await db.insert(friends).values({
        userId: request.friendId,
        friendId: request.userId,
        status: 'confirmed'
      });
      
      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  }

  // Reject a friend request (PostgreSQL implementation)
  async rejectFriendRequest(requestId: string, authenticatedUserId: string): Promise<boolean> {
    try {
      // Get the friend request
      const result = await db.select().from(friends).where(eq(friends.id, requestId)).limit(1);
      const request = result[0];
      
      if (!request || request.status !== 'pending') {
        return false;
      }

      // Only the friend (recipient) can reject the request
      if (request.friendId !== authenticatedUserId) {
        return false;
      }

      // Remove the pending request
      await db.delete(friends).where(eq(friends.id, requestId));
      
      return true;
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      return false;
    }
  }

  // Get all pending friend requests for a user (PostgreSQL implementation)
  async getPendingFriendRequests(userId: string): Promise<PendingFriendRequest[]> {
    try {
      const result = await db.select({
        id: friends.id,
        userId: friends.userId,
        friendId: friends.friendId,
        createdAt: friends.createdAt,
        status: friends.status,
        requester: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          major: users.major,
          avatar: users.avatar,
          dorm: users.dorm,
          college: users.college,
          bio: users.bio,
          grade: users.grade
        }
      })
      .from(friends)
      .innerJoin(users, eq(friends.userId, users.id))
      .where(
        and(
          eq(friends.friendId, userId),
          eq(friends.status, 'pending')
        )
      );
      
      return result.map(row => ({
        id: row.id,
        userId: row.userId,
        friendId: row.friendId,
        createdAt: row.createdAt,
        status: row.status,
        requester: {
          ...row.requester,
          hobbies: null // Add hobbies field
        }
      }));
    } catch (error) {
      console.error('Error getting pending friend requests:', error);
      return [];
    }
  }

  // Helper function to extract hobbies from bio text
  private extractHobbies(bio: string | null): string[] {
    if (!bio) return [];
    
    // Simple keyword extraction for hobbies/interests
    const hobbyKeywords = [
      'reading', 'gaming', 'music', 'sports', 'basketball', 'football', 'soccer', 
      'tennis', 'swimming', 'running', 'hiking', 'cooking', 'photography', 'art',
      'coding', 'programming', 'chess', 'guitar', 'piano', 'movies', 'travel',
      'dancing', 'singing', 'writing', 'drawing', 'cycling', 'yoga', 'gym',
      'anime', 'manga', 'books', 'science', 'research', 'technology', 'AI',
      'machine learning', 'data science'
    ];
    
    const bioLower = bio.toLowerCase();
    return hobbyKeywords.filter(hobby => bioLower.includes(hobby));
  }

  // Helper function to calculate major similarity score
  private calculateMajorSimilarity(major1: string, major2: string): number {
    if (major1 === major2) return 1.0;
    
    // Define major similarity groups
    const majorGroups = [
      ['computer science', 'cs', 'software engineering', 'mathematics', 'math', 'engineering', 'physics'],
      ['economics', 'business', 'finance', 'psychology', 'management', 'marketing'],
      ['english', 'art', 'history', 'philosophy', 'literature', 'languages', 'liberal arts'],
      ['biology', 'chemistry', 'medicine', 'pre-med', 'biochemistry', 'neuroscience'],
      ['political science', 'international relations', 'law', 'public policy']
    ];
    
    const major1Lower = major1.toLowerCase();
    const major2Lower = major2.toLowerCase();
    
    // Find which groups each major belongs to
    let group1 = -1, group2 = -1;
    
    for (let i = 0; i < majorGroups.length; i++) {
      if (majorGroups[i].some(m => major1Lower.includes(m))) group1 = i;
      if (majorGroups[i].some(m => major2Lower.includes(m))) group2 = i;
    }
    
    // Calculate similarity based on group membership
    if (group1 === group2 && group1 !== -1) return 0.8; // Same group
    if (group1 !== -1 && group2 !== -1) return 0.3; // Different groups
    return 0.1; // No group match
  }

  // Smart recommendation algorithm implementation for PostgreSQL
  async getStudyPartnerRecommendations(userId: string, limit = 10): Promise<StudyPartner[]> {
    try {
      // Import the new match algorithm
      const { getStudyPartners } = await import('./matchAlgorithm');
      
      // Prepare snapshot data structure
      const currentUser = await this.getUser(userId);
      if (!currentUser) return [];

      // Get all users
      const allUsers = await db.select().from(users);
      const usersMap = new Map();
      for (const user of allUsers) {
        usersMap.set(user.id, user);
      }

      // Get all schedules
      const schedulesMap = new Map();
      for (const user of allUsers) {
        const userSchedules = await this.getSchedulesByUserId(user.id);
        schedulesMap.set(user.id, userSchedules);
      }

      // Get all statuses  
      const statusesMap = new Map();
      for (const user of allUsers) {
        try {
          const userStatus = await this.getUserStatus(user.id);
          statusesMap.set(user.id, userStatus);
        } catch (error) {
          // Default status if not found
          statusesMap.set(user.id, { status: 'free', message: null });
        }
      }

      // Prepare snapshot
      const snapshot = {
        users: usersMap,
        schedules: schedulesMap,
        statuses: statusesMap
      };

      // Call the new algorithm
      const recommendations = await getStudyPartners(snapshot, userId, new Date(), limit);
      
      // Filter out friends from recommendations
      const filteredRecommendations = [];
      for (const rec of recommendations) {
        const areFriends = await this.areFriends(userId, rec.id);
        if (!areFriends) {
          filteredRecommendations.push(rec);
        }
      }

      console.log(`Generated ${filteredRecommendations.length} recommendations using new algorithm for user ${userId}`);
      return filteredRecommendations;

    } catch (error) {
      console.error('Error in getStudyPartnerRecommendations:', error);
      return [];
    }
  }

  // Message notification methods
  async createMessageNotification(notification: InsertMessageNotification): Promise<MessageNotification> {
    const result = await db.insert(messageNotifications)
      .values({
        ...notification,
        id: randomUUID(),
        createdAt: new Date(),
        isRead: false,
      })
      .returning();
    return result[0];
  }

  async getMessageNotificationsByUserId(userId: string, limit = 50): Promise<MessageNotificationWithSender[]> {
    const result = await db.select({
      id: messageNotifications.id,
      recipientId: messageNotifications.recipientId,
      senderId: messageNotifications.senderId,
      messageId: messageNotifications.messageId,
      messagePreview: messageNotifications.messagePreview,
      isRead: messageNotifications.isRead,
      createdAt: messageNotifications.createdAt,
      sender: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        major: users.major,
        avatar: users.avatar,
      },
      chat: {
        id: chats.id,
        user1Id: chats.user1Id,
        user2Id: chats.user2Id,
      }
    })
    .from(messageNotifications)
    .leftJoin(users, eq(messageNotifications.senderId, users.id))
    .leftJoin(messages, eq(messageNotifications.messageId, messages.id))
    .leftJoin(chats, eq(messages.chatId, chats.id))
    .where(eq(messageNotifications.recipientId, userId))
    .orderBy(desc(messageNotifications.createdAt))
    .limit(limit);

    return result;
  }

  async markMessageNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await db.update(messageNotifications)
      .set({ isRead: true })
      .where(and(
        eq(messageNotifications.id, notificationId),
        eq(messageNotifications.recipientId, userId)
      ))
      .returning();
    
    return result.length > 0;
  }

  async markAllMessageNotificationsAsRead(userId: string): Promise<number> {
    const result = await db.update(messageNotifications)
      .set({ isRead: true })
      .where(and(
        eq(messageNotifications.recipientId, userId),
        eq(messageNotifications.isRead, false)
      ))
      .returning();
    
    return result.length;
  }

  async getUnreadMessageNotificationsCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql`count(*)` })
      .from(messageNotifications)
      .where(and(
        eq(messageNotifications.recipientId, userId),
        eq(messageNotifications.isRead, false)
      ));
    
    return Number(result[0].count) || 0;
  }

  async deleteMessageNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await db.delete(messageNotifications)
      .where(and(
        eq(messageNotifications.id, notificationId),
        eq(messageNotifications.recipientId, userId)
      ))
      .returning();
    
    return result.length > 0;
  }
}

export const storage = new PostgreSQLStorage();
