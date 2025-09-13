import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  major: text("major").notNull(),
  avatar: text("avatar"),
});

// Schedules table
export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  courseCode: text("course_code").notNull(),
  courseName: text("course_name").notNull(),
  day: text("day").notNull(), // monday, tuesday, etc.
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  location: text("location"),
});

// User status table
export const userStatus = pgTable("user_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  manualStatus: text("manual_status").notNull(), // studying, free, help, busy, tired, social
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Status enum for validation
export const statusEnum = z.enum(["studying", "free", "help", "busy", "tired", "social"]);

// Day enum for validation
export const dayEnum = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  major: true,
  avatar: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).pick({
  courseCode: true,
  courseName: true,
  day: true,
  startTime: true,
  endTime: true,
  location: true,
}).extend({
  day: dayEnum,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
});

export const insertStatusSchema = createInsertSchema(userStatus).pick({
  manualStatus: true,
}).extend({
  manualStatus: statusEnum,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

export type InsertStatus = z.infer<typeof insertStatusSchema>;
export type UserStatusType = typeof userStatus.$inferSelect;

// API response types
export type StudyPartner = {
  id: string;
  username: string;
  major: string;
  avatar?: string;
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
    major: string;
    avatar?: string;
    current_class: string;
    manual_status: string;
  }>;
  free: Array<{
    id: string;
    username: string;
    major: string;
    avatar?: string;
    next_class?: string;
    manual_status: string;
  }>;
};
