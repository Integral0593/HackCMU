import { 
  type User, 
  type InsertUser, 
  type Schedule, 
  type InsertSchedule,
  type Chat,
  type InsertChat,
  type Message,
  type InsertMessage,
  type ChatWithLastMessage,
  type MessageWithSender
} from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private schedules: Map<string, Schedule>;
  private chats: Map<string, Chat>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.schedules = new Map();
    this.chats = new Map();
    this.messages = new Map();
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
      avatar: insertUser.avatar ?? null, // Handle undefined by converting to null
      dorm: insertUser.dorm ?? null,
      college: insertUser.college ?? null,
      gender: insertUser.gender ?? null,
      bio: insertUser.bio ?? null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser: User = {
      ...existingUser,
      ...updateData,
      avatar: updateData.avatar ?? existingUser.avatar, // Handle avatar update
      dorm: updateData.dorm ?? existingUser.dorm,
      college: updateData.college ?? existingUser.college,
      gender: updateData.gender ?? existingUser.gender,
      bio: updateData.bio ?? existingUser.bio
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
}

export const storage = new MemStorage();
