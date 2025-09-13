import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import ical from "ical";
import { storage } from "./storage";
import { insertScheduleSchema, type InsertSchedule } from "@shared/schema";

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
      
      // Try to extract course code pattern (e.g., "CS 151 - Intro to Programming")
      const codeMatch = summary.match(/^([A-Z]{2,4}\s*\d{3}[A-Z]?)/);
      if (codeMatch) {
        courseCode = codeMatch[1].trim();
        courseName = summary.replace(codeMatch[0], '').replace(/^[\s\-]+/, '').trim();
      }
      
      if (!courseName) {
        courseName = summary;
      }

      const schedule: InsertSchedule = {
        courseCode: courseCode || 'TBD',
        courseName: courseName,
        day: getDayFromDate(startDate) as any,
        startTime: formatTime(startDate),
        endTime: formatTime(endDate),
        location: event.location || null
      };

      schedules.push(schedule);
    }
  });

  return schedules;
}

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);

  return httpServer;
}
