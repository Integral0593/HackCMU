import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"), // Optional field for complete name display
  major: text("major").notNull(),
  grade: text("grade"), // freshman, sophomore, junior, senior, graduate, phd
  avatar: text("avatar"),
  dorm: text("dorm"),
  college: text("college"),
  gender: text("gender"),
  bio: text("bio"),
});

// Schedules table
export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  courseCode: text("course_code").notNull(),
  courseName: text("course_name").notNull(),
  days: text("days").array().notNull(), // array of days: ["monday", "tuesday", "wednesday"]
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  location: text("location"),
});

// User status table
export const userStatus = pgTable("user_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  manualStatus: text("manual_status").notNull(), // studying, free, in_class, busy, tired, social
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Chats table - stores chat sessions between two users
export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull().references(() => users.id),
  user2Id: varchar("user2_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
});

// Messages table - stores individual messages within chats
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => chats.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // text, system
  sentAt: timestamp("sent_at").defaultNow(),
  readAt: timestamp("read_at"),
});

// Friends table - stores friendship/partner relationships
export const friends = pgTable("friends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  friendId: varchar("friend_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").notNull().default("confirmed"), // confirmed, pending, blocked
});

// Status enum for validation
export const statusEnum = z.enum(["studying", "free", "in_class", "busy", "tired", "social"]);

// Day enum for validation
export const dayEnum = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);

// Gender enum for validation
export const genderEnum = z.enum(["male", "female", "other", "prefer_not_to_say"]);

// Grade enum for validation
export const gradeEnum = z.enum(["freshman", "sophomore", "junior", "senior", "graduate", "phd"]);

// Message type enum for validation
export const messageTypeEnum = z.enum(["text", "system"]);

// Friend status enum for validation
export const friendStatusEnum = z.enum(["confirmed", "pending", "blocked"]);

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  major: true,
  grade: true,
  avatar: true,
  dorm: true,
  college: true,
  gender: true,
  bio: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters").regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  ),
  fullName: z.preprocess(
    (v) => (v === '' ? null : v), 
    z.string().trim().min(1).nullable()
  ).optional(),
  gender: genderEnum.optional(),
  grade: gradeEnum.optional(),
});

// Authentication-specific schemas
export const registerUserSchema = insertUserSchema.pick({
  username: true,
  password: true,
  fullName: true,
  major: true,
}).extend({
  confirmPassword: z.string().min(8),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const updateUserProfileSchema = insertUserSchema.pick({
  fullName: true,
  major: true,
  avatar: true,
  dorm: true,
  college: true,
  gender: true,
  bio: true,
}).partial();

export const insertScheduleSchema = createInsertSchema(schedules).pick({
  courseCode: true,
  courseName: true,
  days: true,
  startTime: true,
  endTime: true,
  location: true,
}).extend({
  days: z.array(dayEnum).min(1, "At least one day must be selected"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
});

export const insertStatusSchema = createInsertSchema(userStatus).pick({
  manualStatus: true,
}).extend({
  manualStatus: statusEnum,
});

export const insertChatSchema = createInsertSchema(chats).pick({
  user1Id: true,
  user2Id: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatId: true,
  senderId: true,
  content: true,
  messageType: true,
}).extend({
  messageType: messageTypeEnum.default("text"),
  content: z.string().min(1).max(1000),
});

export const insertFriendSchema = createInsertSchema(friends).pick({
  userId: true,
  friendId: true,
  status: true,
}).extend({
  status: friendStatusEnum.default("confirmed"),
});

// Friends API validation schemas
export const addFriendSchema = z.object({
  friendId: z.string().min(1, "Friend ID is required"),
});

export const searchUsersSchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters"),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Authentication types
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;

// Auth response types
export type AuthResponse = {
  user: Omit<User, 'password'>;
  message: string;
};

export type PublicUser = Omit<User, 'password'>;

export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

export type InsertStatus = z.infer<typeof insertStatusSchema>;
export type UserStatusType = typeof userStatus.$inferSelect;

export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertFriend = z.infer<typeof insertFriendSchema>;
export type Friend = typeof friends.$inferSelect;

// API response types
export type StudyPartner = {
  id: string;
  username: string;
  fullName?: string | null;
  major: string;
  grade?: string | null;
  bio?: string | null;
  avatar: string | null;
  score: number;
  shared_classes: string[];
  current_class?: string;
  next_class?: string;
  reason: string;
};

export type CurrentStatusResponse = {
  now: string;
  in_class: Array<{
    id: string;
    username: string;
    fullName?: string | null;
    major: string;
    avatar: string | null;
    current_class: string;
    manual_status: string;
  }>;
  free: Array<{
    id: string;
    username: string;
    fullName?: string | null;
    major: string;
    avatar: string | null;
    next_class?: string;
    manual_status: string;
  }>;
};

// Chat API response types
export type ChatWithLastMessage = Chat & {
  lastMessage?: Message;
  otherUser: {
    id: string;
    username: string;
    fullName?: string | null;
    avatar: string | null;
  };
  unreadCount: number;
};

export type MessageWithSender = Message & {
  sender: {
    id: string;
    username: string;
    fullName?: string | null;
    avatar: string | null;
  };
};

// WebSocket message types
export type WebSocketMessage = {
  type: 'auth' | 'message' | 'typing' | 'read_receipt' | 'user_online' | 'user_offline' | 'error';
  data: any;
};

// Search and friends API response types
export type SearchUser = {
  id: string;
  username: string;
  fullName?: string | null;
  major: string;
  avatar: string | null;
  dorm: string | null;
  college: string | null;
  bio: string | null;
  isFriend: boolean;
  sharedClasses: string[];
};

export type FriendWithUser = Friend & {
  friend: {
    id: string;
    username: string;
    fullName?: string | null;
    major: string;
    avatar: string | null;
    dorm: string | null;
    college: string | null;
    bio: string | null;
  };
};
