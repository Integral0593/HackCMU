import { storage } from "./storage";
import { type RegisterUser, type InsertSchedule } from "@shared/schema";
import bcrypt from "bcrypt";

// Test user data with strategic overlaps for recommendation algorithm testing
interface TestUserData {
  user: RegisterUser;
  schedules: InsertSchedule[];
  hobbies: string[];
}

// Strategic course overlaps - these courses will be shared across multiple users
const SHARED_COURSES = {
  // STEM Core (shared by CS, Math, Engineering, Physics)
  CALC_I: { code: "MATH101", name: "Calculus I" },
  LINEAR_ALG: { code: "MATH201", name: "Linear Algebra" },
  STATISTICS: { code: "MATH301", name: "Statistics" },
  
  // CS Core (shared by CS students and some Engineering)
  DATA_STRUCT: { code: "CS201", name: "Data Structures" },
  ALGORITHMS: { code: "CS301", name: "Algorithms" },
  MACHINE_LEARN: { code: "CS401", name: "Machine Learning" },
  
  // General Education (shared across all majors)
  ENG_WRITING: { code: "ENG101", name: "English Writing" },
  PSYCH_INTRO: { code: "PSYCH101", name: "Introduction to Psychology" },
  HIST_MODERN: { code: "HIST201", name: "Modern History" },
  
  // Business/Economics (shared by Economics, some CS)
  MICROECON: { code: "ECON101", name: "Microeconomics" },
  FINANCE: { code: "BUS201", name: "Business Finance" },
  
  // Art/Creative (shared by Art, some Psychology)
  ART_HISTORY: { code: "ART101", name: "Art History" },
  DESIGN: { code: "ART201", name: "Digital Design" }
};

// Test users with strategic overlaps
const TEST_USERS: TestUserData[] = [
  {
    user: {
      username: "alex_cs",
      password: "TestPass123",
      fullName: "Alex Chen",
      major: "Computer Science",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Programming", "Gaming", "Music Production"],
    schedules: [
      { courseCode: SHARED_COURSES.DATA_STRUCT.code, courseName: SHARED_COURSES.DATA_STRUCT.name, day: "monday", startTime: "10:00", endTime: "11:30", location: "CS Building 201" },
      { courseCode: SHARED_COURSES.ALGORITHMS.code, courseName: SHARED_COURSES.ALGORITHMS.name, day: "wednesday", startTime: "14:00", endTime: "15:30", location: "CS Building 301" },
      { courseCode: SHARED_COURSES.LINEAR_ALG.code, courseName: SHARED_COURSES.LINEAR_ALG.name, day: "tuesday", startTime: "09:00", endTime: "10:30", location: "Math Building 105" },
      { courseCode: SHARED_COURSES.ENG_WRITING.code, courseName: SHARED_COURSES.ENG_WRITING.name, day: "friday", startTime: "13:00", endTime: "14:30", location: "Liberal Arts 202" }
    ]
  },
  {
    user: {
      username: "sarah_math",
      password: "TestPass123",
      fullName: "Sarah Williams",
      major: "Mathematics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Reading", "Chess", "Photography"],
    schedules: [
      { courseCode: SHARED_COURSES.CALC_I.code, courseName: SHARED_COURSES.CALC_I.name, day: "monday", startTime: "08:00", endTime: "09:30", location: "Math Building 201" },
      { courseCode: SHARED_COURSES.LINEAR_ALG.code, courseName: SHARED_COURSES.LINEAR_ALG.name, day: "tuesday", startTime: "09:00", endTime: "10:30", location: "Math Building 105" },
      { courseCode: SHARED_COURSES.STATISTICS.code, courseName: SHARED_COURSES.STATISTICS.name, day: "thursday", startTime: "11:00", endTime: "12:30", location: "Math Building 301" },
      { courseCode: SHARED_COURSES.ENG_WRITING.code, courseName: SHARED_COURSES.ENG_WRITING.name, day: "friday", startTime: "13:00", endTime: "14:30", location: "Liberal Arts 202" }
    ]
  },
  {
    user: {
      username: "mike_eng",
      password: "TestPass123",
      fullName: "Michael Rodriguez",
      major: "Engineering",
      confirmPassword: "TestPass123"
    },
    hobbies: ["3D Printing", "Robotics", "Gaming"],
    schedules: [
      { courseCode: SHARED_COURSES.CALC_I.code, courseName: SHARED_COURSES.CALC_I.name, day: "monday", startTime: "08:00", endTime: "09:30", location: "Math Building 201" },
      { courseCode: SHARED_COURSES.DATA_STRUCT.code, courseName: SHARED_COURSES.DATA_STRUCT.name, day: "monday", startTime: "10:00", endTime: "11:30", location: "CS Building 201" },
      { courseCode: "ENG201", courseName: "Engineering Mechanics", day: "wednesday", startTime: "10:00", endTime: "11:30", location: "Engineering 101" },
      { courseCode: SHARED_COURSES.PSYCH_INTRO.code, courseName: SHARED_COURSES.PSYCH_INTRO.name, day: "thursday", startTime: "15:00", endTime: "16:30", location: "Psychology Building 201" }
    ]
  },
  {
    user: {
      username: "emma_econ",
      password: "TestPass123",
      fullName: "Emma Thompson",
      major: "Economics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Finance", "Travel", "Cooking"],
    schedules: [
      { courseCode: SHARED_COURSES.MICROECON.code, courseName: SHARED_COURSES.MICROECON.name, day: "tuesday", startTime: "11:00", endTime: "12:30", location: "Economics Building 101" },
      { courseCode: SHARED_COURSES.STATISTICS.code, courseName: SHARED_COURSES.STATISTICS.name, day: "thursday", startTime: "11:00", endTime: "12:30", location: "Math Building 301" },
      { courseCode: SHARED_COURSES.FINANCE.code, courseName: SHARED_COURSES.FINANCE.name, day: "friday", startTime: "09:00", endTime: "10:30", location: "Business Building 205" },
      { courseCode: SHARED_COURSES.ENG_WRITING.code, courseName: SHARED_COURSES.ENG_WRITING.name, day: "friday", startTime: "13:00", endTime: "14:30", location: "Liberal Arts 202" }
    ]
  },
  {
    user: {
      username: "david_psych",
      password: "TestPass123",
      fullName: "David Kim",
      major: "Psychology",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Reading", "Music", "Fitness"],
    schedules: [
      { courseCode: SHARED_COURSES.PSYCH_INTRO.code, courseName: SHARED_COURSES.PSYCH_INTRO.name, day: "thursday", startTime: "15:00", endTime: "16:30", location: "Psychology Building 201" },
      { courseCode: SHARED_COURSES.STATISTICS.code, courseName: SHARED_COURSES.STATISTICS.name, day: "thursday", startTime: "11:00", endTime: "12:30", location: "Math Building 301" },
      { courseCode: "PSYCH201", courseName: "Cognitive Psychology", day: "monday", startTime: "14:00", endTime: "15:30", location: "Psychology Building 301" },
      { courseCode: SHARED_COURSES.ART_HISTORY.code, courseName: SHARED_COURSES.ART_HISTORY.name, day: "wednesday", startTime: "16:00", endTime: "17:30", location: "Art Building 101" }
    ]
  },
  {
    user: {
      username: "lily_art",
      password: "TestPass123",
      fullName: "Lily Zhang",
      major: "Art",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Photography", "Digital Art", "Music"],
    schedules: [
      { courseCode: SHARED_COURSES.ART_HISTORY.code, courseName: SHARED_COURSES.ART_HISTORY.name, day: "wednesday", startTime: "16:00", endTime: "17:30", location: "Art Building 101" },
      { courseCode: SHARED_COURSES.DESIGN.code, courseName: SHARED_COURSES.DESIGN.name, day: "tuesday", startTime: "14:00", endTime: "15:30", location: "Art Building 205" },
      { courseCode: "ART301", courseName: "Advanced Photography", day: "friday", startTime: "10:00", endTime: "11:30", location: "Art Building 301" },
      { courseCode: SHARED_COURSES.HIST_MODERN.code, courseName: SHARED_COURSES.HIST_MODERN.name, day: "monday", startTime: "16:00", endTime: "17:30", location: "History Building 201" }
    ]
  },
  {
    user: {
      username: "ryan_physics",
      password: "TestPass123",
      fullName: "Ryan Johnson",
      major: "Physics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Programming", "Astronomy", "Chess"],
    schedules: [
      { courseCode: SHARED_COURSES.CALC_I.code, courseName: SHARED_COURSES.CALC_I.name, day: "monday", startTime: "08:00", endTime: "09:30", location: "Math Building 201" },
      { courseCode: SHARED_COURSES.LINEAR_ALG.code, courseName: SHARED_COURSES.LINEAR_ALG.name, day: "tuesday", startTime: "09:00", endTime: "10:30", location: "Math Building 105" },
      { courseCode: "PHYS201", courseName: "Classical Mechanics", day: "wednesday", startTime: "08:00", endTime: "09:30", location: "Physics Building 101" },
      { courseCode: SHARED_COURSES.DATA_STRUCT.code, courseName: SHARED_COURSES.DATA_STRUCT.name, day: "monday", startTime: "10:00", endTime: "11:30", location: "CS Building 201" }
    ]
  },
  {
    user: {
      username: "nina_cs2",
      password: "TestPass123",
      fullName: "Nina Patel",
      major: "Computer Science",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Gaming", "AI Research", "Fitness"],
    schedules: [
      { courseCode: SHARED_COURSES.ALGORITHMS.code, courseName: SHARED_COURSES.ALGORITHMS.name, day: "wednesday", startTime: "14:00", endTime: "15:30", location: "CS Building 301" },
      { courseCode: SHARED_COURSES.MACHINE_LEARN.code, courseName: SHARED_COURSES.MACHINE_LEARN.name, day: "tuesday", startTime: "16:00", endTime: "17:30", location: "CS Building 401" },
      { courseCode: SHARED_COURSES.STATISTICS.code, courseName: SHARED_COURSES.STATISTICS.name, day: "thursday", startTime: "11:00", endTime: "12:30", location: "Math Building 301" },
      { courseCode: SHARED_COURSES.MICROECON.code, courseName: SHARED_COURSES.MICROECON.name, day: "tuesday", startTime: "11:00", endTime: "12:30", location: "Economics Building 101" }
    ]
  },
  {
    user: {
      username: "jake_math2",
      password: "TestPass123",
      fullName: "Jake Anderson",
      major: "Mathematics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Chess", "Programming", "Finance"],
    schedules: [
      { courseCode: SHARED_COURSES.LINEAR_ALG.code, courseName: SHARED_COURSES.LINEAR_ALG.name, day: "tuesday", startTime: "09:00", endTime: "10:30", location: "Math Building 105" },
      { courseCode: SHARED_COURSES.ALGORITHMS.code, courseName: SHARED_COURSES.ALGORITHMS.name, day: "wednesday", startTime: "14:00", endTime: "15:30", location: "CS Building 301" },
      { courseCode: "MATH401", courseName: "Abstract Algebra", day: "thursday", startTime: "09:00", endTime: "10:30", location: "Math Building 401" },
      { courseCode: SHARED_COURSES.FINANCE.code, courseName: SHARED_COURSES.FINANCE.name, day: "friday", startTime: "09:00", endTime: "10:30", location: "Business Building 205" }
    ]
  },
  {
    user: {
      username: "zoe_interdis",
      password: "TestPass123",
      fullName: "Zoe Martinez",
      major: "Economics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Travel", "Digital Art", "Finance"],
    schedules: [
      { courseCode: SHARED_COURSES.MACHINE_LEARN.code, courseName: SHARED_COURSES.MACHINE_LEARN.name, day: "tuesday", startTime: "16:00", endTime: "17:30", location: "CS Building 401" },
      { courseCode: SHARED_COURSES.MICROECON.code, courseName: SHARED_COURSES.MICROECON.name, day: "tuesday", startTime: "11:00", endTime: "12:30", location: "Economics Building 101" },
      { courseCode: SHARED_COURSES.DESIGN.code, courseName: SHARED_COURSES.DESIGN.name, day: "tuesday", startTime: "14:00", endTime: "15:30", location: "Art Building 205" },
      { courseCode: SHARED_COURSES.HIST_MODERN.code, courseName: SHARED_COURSES.HIST_MODERN.name, day: "monday", startTime: "16:00", endTime: "17:30", location: "History Building 201" }
    ]
  }
];

// Function to create bio text from hobbies
function createBioFromHobbies(fullName: string, major: string, hobbies: string[]): string {
  const majorDesc = major === "Computer Science" ? "CS" : major;
  return `${majorDesc} student who enjoys ${hobbies.join(", ")}. Looking for study partners and academic collaboration!`;
}

// Function to hash password
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Main function to insert test users and their schedules
export async function insertTestData(): Promise<void> {
  console.log("Starting test data insertion...");
  
  try {
    for (const testUser of TEST_USERS) {
      console.log(`Creating user: ${testUser.user.username}`);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(testUser.user.username);
      if (existingUser) {
        console.log(`User ${testUser.user.username} already exists, skipping...`);
        continue;
      }
      
      // Create user (let registerUser handle password hashing)
      const bio = createBioFromHobbies(testUser.user.fullName!, testUser.user.major, testUser.hobbies);
      
      const createdUser = await storage.registerUser({
        username: testUser.user.username,
        password: testUser.user.password, // Use plain text password
        fullName: testUser.user.fullName,
        major: testUser.user.major,
        confirmPassword: testUser.user.password, // Same as password
      });
      
      // Update user with bio and additional profile info
      await storage.updateUser(createdUser.id, {
        bio: bio,
        college: "Carnegie Mellon University", // Default college
        dorm: `${testUser.user.fullName!.split(' ')[0]}'s Dorm`, // Generate dorm name
        avatar: null // Let users add their own avatars
      });
      
      console.log(`Created user: ${testUser.user.username} (${createdUser.id})`);
      
      // Add schedules for this user
      console.log(`Adding ${testUser.schedules.length} schedules for ${testUser.user.username}`);
      for (const schedule of testUser.schedules) {
        await storage.createSchedule(schedule, createdUser.id);
      }
      
      console.log(`Completed setup for user: ${testUser.user.username}`);
    }
    
    console.log("Test data insertion completed successfully!");
    
    // Print summary of overlaps
    console.log("\n=== TEST DATA SUMMARY ===");
    console.log("Shared courses for recommendation testing:");
    Object.values(SHARED_COURSES).forEach(course => {
      const usersWithCourse = TEST_USERS.filter(user => 
        user.schedules.some(schedule => schedule.courseCode === course.code)
      );
      console.log(`${course.code} (${course.name}): ${usersWithCourse.length} users - ${usersWithCourse.map(u => u.user.username).join(", ")}`);
    });
    
    console.log("\nMajor distribution:");
    const majorCounts = TEST_USERS.reduce((acc, user) => {
      acc[user.user.major] = (acc[user.user.major] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(majorCounts).forEach(([major, count]) => {
      console.log(`${major}: ${count} users`);
    });
    
    console.log("\nHobby overlaps:");
    const allHobbies = TEST_USERS.flatMap(user => user.hobbies);
    const hobbyCounts = allHobbies.reduce((acc, hobby) => {
      acc[hobby] = (acc[hobby] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(hobbyCounts)
      .filter(([_, count]) => count > 1)
      .forEach(([hobby, count]) => {
        console.log(`${hobby}: ${count} users`);
      });
      
  } catch (error) {
    console.error("Error inserting test data:", error);
    throw error;
  }
}

// Function to clear test data (for cleanup)
export async function clearTestData(): Promise<void> {
  console.log("Clearing test data...");
  
  for (const testUser of TEST_USERS) {
    try {
      const user = await storage.getUserByUsername(testUser.user.username);
      if (user) {
        // Note: This requires implementing a delete user method in storage
        console.log(`Would delete user: ${testUser.user.username} (implement deleteUser method)`);
      }
    } catch (error) {
      console.warn(`Could not clear user ${testUser.user.username}:`, error);
    }
  }
}

// Export test user data for reference
export { TEST_USERS, SHARED_COURSES };