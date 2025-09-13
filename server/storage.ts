import { type User, type InsertUser, type Schedule, type InsertSchedule } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Schedule methods
  getSchedulesByUserId(userId: string): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule, userId: string): Promise<Schedule>;
  deleteSchedule(scheduleId: string, userId: string): Promise<boolean>;
  createMultipleSchedules(schedules: InsertSchedule[], userId: string): Promise<Schedule[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private schedules: Map<string, Schedule>;

  constructor() {
    this.users = new Map();
    this.schedules = new Map();
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
      avatar: insertUser.avatar ?? null // Handle undefined by converting to null
    };
    this.users.set(id, user);
    return user;
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
}

export const storage = new MemStorage();
