import { storage } from "./storage";
import { type RegisterUser, type InsertSchedule } from "@shared/schema";
import bcrypt from "bcrypt";

// Test user data with strategic overlaps for recommendation algorithm testing
interface TestUserData {
  user: RegisterUser;
  schedules: InsertSchedule[];
  hobbies: string[];
}

// Strategic course overlaps using real CMU course codes - these courses will be shared across multiple users
const SHARED_COURSES = {
  // STEM Core (shared by CS, Math, Engineering, Physics)
  CALC_I: { code: "21120", name: "Differential and Integral Calculus" },
  LINEAR_ALG: { code: "21241", name: "Matrices and Linear Transformations" },
  STATISTICS: { code: "36225", name: "Introduction to Probability Theory" },
  
  // CS Core (shared by CS students and some Engineering)
  DATA_STRUCT: { code: "15122", name: "Principles of Imperative Computation" },
  ALGORITHMS: { code: "15451", name: "Algorithm Design and Analysis" },
  MACHINE_LEARN: { code: "10301", name: "Introduction to Machine Learning" },
  PROG_FUNDAMENTALS: { code: "15112", name: "Fundamentals of Programming" },
  COMPUTER_SYSTEMS: { code: "15213", name: "Introduction to Computer Systems" },
  
  // General Education (shared across all majors)
  ENG_WRITING: { code: "76101", name: "Interpretation and Argument" },
  PSYCH_INTRO: { code: "85102", name: "Introduction to Psychology" },
  MODERN_REGRESSION: { code: "36401", name: "Modern Regression" },
  HIST_MODERN: { code: "79262", name: "Modern World History" },
  
  // Business/Economics (shared by Economics, some CS)
  MICROECON: { code: "73100", name: "Principles of Economics" },
  STATISTICS_DATA: { code: "36202", name: "Methods for Statistics & Data Science" },
  FINANCE: { code: "73230", name: "Corporate Finance" },
  
  // Art/Creative (shared by Art, some Psychology)
  ART_HISTORY: { code: "60101", name: "Introduction to Art History" },
  DESIGN: { code: "51261", name: "Interaction Design Fundamentals" },
  
  // Additional realistic CMU courses for variety
  STATISTICAL_COMPUTING: { code: "36350", name: "Statistical Computing" },
  PSYCH_GAMES: { code: "85107", name: "The Psychology of Video Games" },
  SOCIAL_PSYCH: { code: "85150", name: "Social Psychology" },
  THEORETICAL_CS: { code: "15251", name: "Great Ideas in Theoretical Computer Science" }
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
      { courseCode: SHARED_COURSES.MACHINE_LEARN.code, courseName: SHARED_COURSES.MACHINE_LEARN.name, days: ["monday"], startTime: "10:00", endTime: "11:30", location: "Gates 4401" },
      { courseCode: SHARED_COURSES.STATISTICAL_COMPUTING.code, courseName: SHARED_COURSES.STATISTICAL_COMPUTING.name, days: ["wednesday"], startTime: "14:00", endTime: "15:30", location: "Baker Hall 150" },
      { courseCode: SHARED_COURSES.DATA_STRUCT.code, courseName: SHARED_COURSES.DATA_STRUCT.name, days: ["tuesday"], startTime: "09:00", endTime: "10:30", location: "GHC 4307" },
      { courseCode: SHARED_COURSES.PSYCH_GAMES.code, courseName: SHARED_COURSES.PSYCH_GAMES.name, days: ["friday"], startTime: "13:00", endTime: "14:30", location: "Porter Hall 226B" }
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
      { courseCode: SHARED_COURSES.MACHINE_LEARN.code, courseName: SHARED_COURSES.MACHINE_LEARN.name, days: ["monday"], startTime: "08:00", endTime: "09:30", location: "Gates 4401" },
      { courseCode: SHARED_COURSES.STATISTICAL_COMPUTING.code, courseName: SHARED_COURSES.STATISTICAL_COMPUTING.name, days: ["tuesday"], startTime: "09:00", endTime: "10:30", location: "Baker Hall 150" },
      { courseCode: SHARED_COURSES.MODERN_REGRESSION.code, courseName: SHARED_COURSES.MODERN_REGRESSION.name, days: ["thursday"], startTime: "11:00", endTime: "12:30", location: "Baker Hall 232" },
      { courseCode: SHARED_COURSES.SOCIAL_PSYCH.code, courseName: SHARED_COURSES.SOCIAL_PSYCH.name, days: ["friday"], startTime: "13:00", endTime: "14:30", location: "Porter Hall 125" }
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
      { courseCode: SHARED_COURSES.CALC_I.code, courseName: SHARED_COURSES.CALC_I.name, days: ["monday"], startTime: "08:00", endTime: "09:30", location: "Math Building 201" },
      { courseCode: SHARED_COURSES.DATA_STRUCT.code, courseName: SHARED_COURSES.DATA_STRUCT.name, days: ["monday"], startTime: "10:00", endTime: "11:30", location: "CS Building 201" },
      { courseCode: "ENG201", courseName: "Engineering Mechanics", days: ["wednesday"], startTime: "10:00", endTime: "11:30", location: "Engineering 101" },
      { courseCode: SHARED_COURSES.PSYCH_INTRO.code, courseName: SHARED_COURSES.PSYCH_INTRO.name, days: ["thursday"], startTime: "15:00", endTime: "16:30", location: "Psychology Building 201" }
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
      { courseCode: SHARED_COURSES.MICROECON.code, courseName: SHARED_COURSES.MICROECON.name, days: ["tuesday"], startTime: "11:00", endTime: "12:30", location: "Economics Building 101" },
      { courseCode: SHARED_COURSES.STATISTICS.code, courseName: SHARED_COURSES.STATISTICS.name, days: ["thursday"], startTime: "11:00", endTime: "12:30", location: "Math Building 301" },
      { courseCode: SHARED_COURSES.FINANCE.code, courseName: SHARED_COURSES.FINANCE.name, days: ["friday"], startTime: "09:00", endTime: "10:30", location: "Business Building 205" },
      { courseCode: SHARED_COURSES.ENG_WRITING.code, courseName: SHARED_COURSES.ENG_WRITING.name, days: ["friday"], startTime: "13:00", endTime: "14:30", location: "Liberal Arts 202" }
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
      { courseCode: SHARED_COURSES.PSYCH_INTRO.code, courseName: SHARED_COURSES.PSYCH_INTRO.name, days: ["thursday"], startTime: "15:00", endTime: "16:30", location: "Psychology Building 201" },
      { courseCode: SHARED_COURSES.STATISTICS.code, courseName: SHARED_COURSES.STATISTICS.name, days: ["thursday"], startTime: "11:00", endTime: "12:30", location: "Math Building 301" },
      { courseCode: "PSYCH201", courseName: "Cognitive Psychology", days: ["monday"], startTime: "14:00", endTime: "15:30", location: "Psychology Building 301" },
      { courseCode: SHARED_COURSES.ART_HISTORY.code, courseName: SHARED_COURSES.ART_HISTORY.name, days: ["wednesday"], startTime: "16:00", endTime: "17:30", location: "Art Building 101" }
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
      { courseCode: SHARED_COURSES.ART_HISTORY.code, courseName: SHARED_COURSES.ART_HISTORY.name, days: ["wednesday"], startTime: "16:00", endTime: "17:30", location: "Art Building 101" },
      { courseCode: SHARED_COURSES.DESIGN.code, courseName: SHARED_COURSES.DESIGN.name, days: ["tuesday"], startTime: "14:00", endTime: "15:30", location: "Art Building 205" },
      { courseCode: "ART301", courseName: "Advanced Photography", days: ["friday"], startTime: "10:00", endTime: "11:30", location: "Art Building 301" },
      { courseCode: SHARED_COURSES.HIST_MODERN.code, courseName: SHARED_COURSES.HIST_MODERN.name, days: ["monday"], startTime: "16:00", endTime: "17:30", location: "History Building 201" }
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
      { courseCode: SHARED_COURSES.CALC_I.code, courseName: SHARED_COURSES.CALC_I.name, days: ["monday"], startTime: "08:00", endTime: "09:30", location: "Math Building 201" },
      { courseCode: SHARED_COURSES.LINEAR_ALG.code, courseName: SHARED_COURSES.LINEAR_ALG.name, days: ["tuesday"], startTime: "09:00", endTime: "10:30", location: "Math Building 105" },
      { courseCode: "PHYS201", courseName: "Classical Mechanics", days: ["wednesday"], startTime: "08:00", endTime: "09:30", location: "Physics Building 101" },
      { courseCode: SHARED_COURSES.DATA_STRUCT.code, courseName: SHARED_COURSES.DATA_STRUCT.name, days: ["monday"], startTime: "10:00", endTime: "11:30", location: "CS Building 201" }
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
      { courseCode: SHARED_COURSES.MACHINE_LEARN.code, courseName: SHARED_COURSES.MACHINE_LEARN.name, days: ["monday"], startTime: "10:00", endTime: "11:30", location: "Gates 4401" },
      { courseCode: SHARED_COURSES.MODERN_REGRESSION.code, courseName: SHARED_COURSES.MODERN_REGRESSION.name, days: ["tuesday"], startTime: "16:00", endTime: "17:30", location: "Baker Hall 150" },
      { courseCode: SHARED_COURSES.SOCIAL_PSYCH.code, courseName: SHARED_COURSES.SOCIAL_PSYCH.name, days: ["thursday"], startTime: "11:00", endTime: "12:30", location: "Porter Hall 125" },
      { courseCode: SHARED_COURSES.DATA_STRUCT.code, courseName: SHARED_COURSES.DATA_STRUCT.name, days: ["friday"], startTime: "14:00", endTime: "15:30", location: "GHC 4307" }
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
      { courseCode: SHARED_COURSES.LINEAR_ALG.code, courseName: SHARED_COURSES.LINEAR_ALG.name, days: ["tuesday"], startTime: "09:00", endTime: "10:30", location: "Math Building 105" },
      { courseCode: SHARED_COURSES.ALGORITHMS.code, courseName: SHARED_COURSES.ALGORITHMS.name, days: ["wednesday"], startTime: "14:00", endTime: "15:30", location: "CS Building 301" },
      { courseCode: "MATH401", courseName: "Abstract Algebra", days: ["thursday"], startTime: "09:00", endTime: "10:30", location: "Math Building 401" },
      { courseCode: SHARED_COURSES.FINANCE.code, courseName: SHARED_COURSES.FINANCE.name, days: ["friday"], startTime: "09:00", endTime: "10:30", location: "Business Building 205" }
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
      { courseCode: SHARED_COURSES.MACHINE_LEARN.code, courseName: SHARED_COURSES.MACHINE_LEARN.name, days: ["tuesday"], startTime: "16:00", endTime: "17:30", location: "CS Building 401" },
      { courseCode: SHARED_COURSES.MICROECON.code, courseName: SHARED_COURSES.MICROECON.name, days: ["tuesday"], startTime: "11:00", endTime: "12:30", location: "Economics Building 101" },
      { courseCode: SHARED_COURSES.DESIGN.code, courseName: SHARED_COURSES.DESIGN.name, days: ["tuesday"], startTime: "14:00", endTime: "15:30", location: "Art Building 205" },
      { courseCode: SHARED_COURSES.HIST_MODERN.code, courseName: SHARED_COURSES.HIST_MODERN.name, days: ["monday"], startTime: "16:00", endTime: "17:30", location: "History Building 201" }
    ]
  },
  // Additional CS students (forming a 5-person CS group)
  {
    user: {
      username: "kevin_cs3",
      password: "TestPass123",
      fullName: "Kevin Liu",
      major: "Computer Science",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Machine Learning", "Basketball", "Coding"],
    schedules: [
      { courseCode: SHARED_COURSES.DATA_STRUCT.code, courseName: SHARED_COURSES.DATA_STRUCT.name, days: ["monday"], startTime: "10:00", endTime: "11:30", location: "CS Building 201" },
      { courseCode: SHARED_COURSES.MACHINE_LEARN.code, courseName: SHARED_COURSES.MACHINE_LEARN.name, days: ["tuesday"], startTime: "16:00", endTime: "17:30", location: "CS Building 401" },
      { courseCode: SHARED_COURSES.LINEAR_ALG.code, courseName: SHARED_COURSES.LINEAR_ALG.name, days: ["tuesday"], startTime: "09:00", endTime: "10:30", location: "Math Building 105" },
      { courseCode: "CS501", courseName: "Advanced Algorithms", days: ["thursday"], startTime: "14:00", endTime: "15:30", location: "CS Building 501" }
    ]
  },
  {
    user: {
      username: "maria_cs4",
      password: "TestPass123",
      fullName: "Maria Rodriguez",
      major: "Computer Science",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Web Development", "Music", "Gaming"],
    schedules: [
      { courseCode: SHARED_COURSES.ALGORITHMS.code, courseName: SHARED_COURSES.ALGORITHMS.name, days: ["wednesday"], startTime: "14:00", endTime: "15:30", location: "CS Building 301" },
      { courseCode: "CS202", courseName: "Database Systems", days: ["tuesday"], startTime: "11:00", endTime: "12:30", location: "CS Building 202" },
      { courseCode: SHARED_COURSES.ENG_WRITING.code, courseName: SHARED_COURSES.ENG_WRITING.name, days: ["friday"], startTime: "13:00", endTime: "14:30", location: "Liberal Arts 202" },
      { courseCode: SHARED_COURSES.STATISTICS.code, courseName: SHARED_COURSES.STATISTICS.name, days: ["thursday"], startTime: "11:00", endTime: "12:30", location: "Math Building 301" }
    ]
  },
  {
    user: {
      username: "tom_cs5",
      password: "TestPass123",
      fullName: "Thomas Wilson",
      major: "Computer Science",
      confirmPassword: "TestPass123"
    },
    hobbies: ["AI Research", "Chess", "Programming"],
    schedules: [
      { courseCode: SHARED_COURSES.MACHINE_LEARN.code, courseName: SHARED_COURSES.MACHINE_LEARN.name, days: ["tuesday"], startTime: "16:00", endTime: "17:30", location: "CS Building 401" },
      { courseCode: SHARED_COURSES.DATA_STRUCT.code, courseName: SHARED_COURSES.DATA_STRUCT.name, days: ["monday"], startTime: "10:00", endTime: "11:30", location: "CS Building 201" },
      { courseCode: "CS601", courseName: "Artificial Intelligence", days: ["wednesday"], startTime: "16:00", endTime: "17:30", location: "CS Building 601" },
      { courseCode: SHARED_COURSES.CALC_I.code, courseName: SHARED_COURSES.CALC_I.name, days: ["monday"], startTime: "08:00", endTime: "09:30", location: "Math Building 201" }
    ]
  },
  // Additional Math students (forming a 5-person Math group)
  {
    user: {
      username: "anna_math3",
      password: "TestPass123",
      fullName: "Anna Thompson",
      major: "Mathematics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Statistics", "Reading", "Tennis"],
    schedules: [
      { courseCode: SHARED_COURSES.CALC_I.code, courseName: SHARED_COURSES.CALC_I.name, days: ["monday"], startTime: "08:00", endTime: "09:30", location: "Math Building 201" },
      { courseCode: SHARED_COURSES.LINEAR_ALG.code, courseName: SHARED_COURSES.LINEAR_ALG.name, days: ["tuesday"], startTime: "09:00", endTime: "10:30", location: "Math Building 105" },
      { courseCode: SHARED_COURSES.STATISTICS.code, courseName: SHARED_COURSES.STATISTICS.name, days: ["thursday"], startTime: "11:00", endTime: "12:30", location: "Math Building 301" },
      { courseCode: "MATH501", courseName: "Real Analysis", days: ["friday"], startTime: "10:00", endTime: "11:30", location: "Math Building 501" }
    ]
  },
  {
    user: {
      username: "ben_math4",
      password: "TestPass123",
      fullName: "Benjamin Davis",
      major: "Mathematics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Programming", "Finance", "Soccer"],
    schedules: [
      { courseCode: SHARED_COURSES.ALGORITHMS.code, courseName: SHARED_COURSES.ALGORITHMS.name, days: ["wednesday"], startTime: "14:00", endTime: "15:30", location: "CS Building 301" },
      { courseCode: SHARED_COURSES.LINEAR_ALG.code, courseName: SHARED_COURSES.LINEAR_ALG.name, days: ["tuesday"], startTime: "09:00", endTime: "10:30", location: "Math Building 105" },
      { courseCode: SHARED_COURSES.FINANCE.code, courseName: SHARED_COURSES.FINANCE.name, days: ["friday"], startTime: "09:00", endTime: "10:30", location: "Business Building 205" },
      { courseCode: "MATH301", courseName: "Differential Equations", days: ["wednesday"], startTime: "10:00", endTime: "11:30", location: "Math Building 301" }
    ]
  },
  {
    user: {
      username: "lisa_math5",
      password: "TestPass123",
      fullName: "Lisa Park",
      major: "Mathematics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Teaching", "Photography", "Hiking"],
    schedules: [
      { courseCode: SHARED_COURSES.CALC_I.code, courseName: SHARED_COURSES.CALC_I.name, days: ["monday"], startTime: "08:00", endTime: "09:30", location: "Math Building 201" },
      { courseCode: SHARED_COURSES.STATISTICS.code, courseName: SHARED_COURSES.STATISTICS.name, days: ["thursday"], startTime: "11:00", endTime: "12:30", location: "Math Building 301" },
      { courseCode: SHARED_COURSES.ENG_WRITING.code, courseName: SHARED_COURSES.ENG_WRITING.name, days: ["friday"], startTime: "13:00", endTime: "14:30", location: "Liberal Arts 202" },
      { courseCode: "MATH201", courseName: "Discrete Mathematics", days: ["tuesday"], startTime: "14:00", endTime: "15:30", location: "Math Building 201" }
    ]
  },
  // Additional Economics students (forming a 5-person Economics group)
  {
    user: {
      username: "carlos_econ3",
      password: "TestPass123",
      fullName: "Carlos Mendez",
      major: "Economics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Finance", "Basketball", "Trading"],
    schedules: [
      { courseCode: SHARED_COURSES.MICROECON.code, courseName: SHARED_COURSES.MICROECON.name, days: ["tuesday"], startTime: "11:00", endTime: "12:30", location: "Economics Building 101" },
      { courseCode: SHARED_COURSES.FINANCE.code, courseName: SHARED_COURSES.FINANCE.name, days: ["friday"], startTime: "09:00", endTime: "10:30", location: "Business Building 205" },
      { courseCode: "ECON201", courseName: "Macroeconomics", days: ["thursday"], startTime: "09:00", endTime: "10:30", location: "Economics Building 201" },
      { courseCode: SHARED_COURSES.STATISTICS.code, courseName: SHARED_COURSES.STATISTICS.name, days: ["thursday"], startTime: "11:00", endTime: "12:30", location: "Math Building 301" }
    ]
  },
  {
    user: {
      username: "sophie_econ4",
      password: "TestPass123",
      fullName: "Sophie Chen",
      major: "Economics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Policy Research", "Travel", "Cooking"],
    schedules: [
      { courseCode: SHARED_COURSES.MICROECON.code, courseName: SHARED_COURSES.MICROECON.name, days: ["tuesday"], startTime: "11:00", endTime: "12:30", location: "Economics Building 101" },
      { courseCode: SHARED_COURSES.MACHINE_LEARN.code, courseName: SHARED_COURSES.MACHINE_LEARN.name, days: ["tuesday"], startTime: "16:00", endTime: "17:30", location: "CS Building 401" },
      { courseCode: "ECON301", courseName: "Econometrics", days: ["monday"], startTime: "14:00", endTime: "15:30", location: "Economics Building 301" },
      { courseCode: SHARED_COURSES.ENG_WRITING.code, courseName: SHARED_COURSES.ENG_WRITING.name, days: ["friday"], startTime: "13:00", endTime: "14:30", location: "Liberal Arts 202" }
    ]
  },
  {
    user: {
      username: "james_econ5",
      password: "TestPass123",
      fullName: "James Taylor",
      major: "Economics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Data Analysis", "Gaming", "Finance"],
    schedules: [
      { courseCode: SHARED_COURSES.FINANCE.code, courseName: SHARED_COURSES.FINANCE.name, days: ["friday"], startTime: "09:00", endTime: "10:30", location: "Business Building 205" },
      { courseCode: SHARED_COURSES.STATISTICS.code, courseName: SHARED_COURSES.STATISTICS.name, days: ["thursday"], startTime: "11:00", endTime: "12:30", location: "Math Building 301" },
      { courseCode: SHARED_COURSES.DATA_STRUCT.code, courseName: SHARED_COURSES.DATA_STRUCT.name, days: ["monday"], startTime: "10:00", endTime: "11:30", location: "CS Building 201" },
      { courseCode: "ECON401", courseName: "International Economics", days: ["wednesday"], startTime: "11:00", endTime: "12:30", location: "Economics Building 401" }
    ]
  },
  // Additional Psychology students
  {
    user: {
      username: "rachel_psych2",
      password: "TestPass123",
      fullName: "Rachel Johnson",
      major: "Psychology",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Research", "Yoga", "Reading"],
    schedules: [
      { courseCode: SHARED_COURSES.PSYCH_INTRO.code, courseName: SHARED_COURSES.PSYCH_INTRO.name, days: ["thursday"], startTime: "15:00", endTime: "16:30", location: "Psychology Building 201" },
      { courseCode: SHARED_COURSES.STATISTICS.code, courseName: SHARED_COURSES.STATISTICS.name, days: ["thursday"], startTime: "11:00", endTime: "12:30", location: "Math Building 301" },
      { courseCode: "PSYCH301", courseName: "Research Methods", days: ["tuesday"], startTime: "13:00", endTime: "14:30", location: "Psychology Building 301" },
      { courseCode: SHARED_COURSES.ART_HISTORY.code, courseName: SHARED_COURSES.ART_HISTORY.name, days: ["wednesday"], startTime: "16:00", endTime: "17:30", location: "Art Building 101" }
    ]
  },
  {
    user: {
      username: "peter_psych3",
      password: "TestPass123",
      fullName: "Peter Wang",
      major: "Psychology",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Music Therapy", "Guitar", "Fitness"],
    schedules: [
      { courseCode: SHARED_COURSES.PSYCH_INTRO.code, courseName: SHARED_COURSES.PSYCH_INTRO.name, days: ["thursday"], startTime: "15:00", endTime: "16:30", location: "Psychology Building 201" },
      { courseCode: "PSYCH401", courseName: "Abnormal Psychology", days: ["monday"], startTime: "11:00", endTime: "12:30", location: "Psychology Building 401" },
      { courseCode: SHARED_COURSES.ENG_WRITING.code, courseName: SHARED_COURSES.ENG_WRITING.name, days: ["friday"], startTime: "13:00", endTime: "14:30", location: "Liberal Arts 202" },
      { courseCode: SHARED_COURSES.DESIGN.code, courseName: SHARED_COURSES.DESIGN.name, days: ["tuesday"], startTime: "14:00", endTime: "15:30", location: "Art Building 205" }
    ]
  },
  // Additional Physics students  
  {
    user: {
      username: "elena_physics2",
      password: "TestPass123",
      fullName: "Elena Volkov",
      major: "Physics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Research", "Programming", "Rock Climbing"],
    schedules: [
      { courseCode: SHARED_COURSES.CALC_I.code, courseName: SHARED_COURSES.CALC_I.name, days: ["monday"], startTime: "08:00", endTime: "09:30", location: "Math Building 201" },
      { courseCode: SHARED_COURSES.LINEAR_ALG.code, courseName: SHARED_COURSES.LINEAR_ALG.name, days: ["tuesday"], startTime: "09:00", endTime: "10:30", location: "Math Building 105" },
      { courseCode: "PHYS301", courseName: "Quantum Mechanics", days: ["thursday"], startTime: "10:00", endTime: "11:30", location: "Physics Building 301" },
      { courseCode: SHARED_COURSES.DATA_STRUCT.code, courseName: SHARED_COURSES.DATA_STRUCT.name, days: ["monday"], startTime: "10:00", endTime: "11:30", location: "CS Building 201" }
    ]
  },
  {
    user: {
      username: "mark_physics3",
      password: "TestPass123",
      fullName: "Mark Stevens",
      major: "Physics",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Astronomy", "Photography", "Chess"],
    schedules: [
      { courseCode: SHARED_COURSES.LINEAR_ALG.code, courseName: SHARED_COURSES.LINEAR_ALG.name, days: ["tuesday"], startTime: "09:00", endTime: "10:30", location: "Math Building 105" },
      { courseCode: "PHYS201", courseName: "Classical Mechanics", days: ["wednesday"], startTime: "08:00", endTime: "09:30", location: "Physics Building 101" },
      { courseCode: SHARED_COURSES.ALGORITHMS.code, courseName: SHARED_COURSES.ALGORITHMS.name, days: ["wednesday"], startTime: "14:00", endTime: "15:30", location: "CS Building 301" },
      { courseCode: "PHYS401", courseName: "Electromagnetism", days: ["friday"], startTime: "11:00", endTime: "12:30", location: "Physics Building 401" }
    ]
  },
  // Additional Engineering student
  {
    user: {
      username: "diana_eng2",
      password: "TestPass123",
      fullName: "Diana Foster",
      major: "Engineering",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Robotics", "3D Printing", "Design"],
    schedules: [
      { courseCode: SHARED_COURSES.CALC_I.code, courseName: SHARED_COURSES.CALC_I.name, days: ["monday"], startTime: "08:00", endTime: "09:30", location: "Math Building 201" },
      { courseCode: SHARED_COURSES.DATA_STRUCT.code, courseName: SHARED_COURSES.DATA_STRUCT.name, days: ["monday"], startTime: "10:00", endTime: "11:30", location: "CS Building 201" },
      { courseCode: "ENG301", courseName: "Thermodynamics", days: ["tuesday"], startTime: "13:00", endTime: "14:30", location: "Engineering 301" },
      { courseCode: SHARED_COURSES.LINEAR_ALG.code, courseName: SHARED_COURSES.LINEAR_ALG.name, days: ["tuesday"], startTime: "09:00", endTime: "10:30", location: "Math Building 105" }
    ]
  },
  // Additional Art student
  {
    user: {
      username: "max_art2",
      password: "TestPass123",
      fullName: "Max Rivera",
      major: "Art",
      confirmPassword: "TestPass123"
    },
    hobbies: ["Digital Art", "Video Games", "Music"],
    schedules: [
      { courseCode: SHARED_COURSES.ART_HISTORY.code, courseName: SHARED_COURSES.ART_HISTORY.name, days: ["wednesday"], startTime: "16:00", endTime: "17:30", location: "Art Building 101" },
      { courseCode: SHARED_COURSES.DESIGN.code, courseName: SHARED_COURSES.DESIGN.name, days: ["tuesday"], startTime: "14:00", endTime: "15:30", location: "Art Building 205" },
      { courseCode: "ART401", courseName: "3D Animation", days: ["thursday"], startTime: "13:00", endTime: "14:30", location: "Art Building 401" },
      { courseCode: SHARED_COURSES.PSYCH_INTRO.code, courseName: SHARED_COURSES.PSYCH_INTRO.name, days: ["thursday"], startTime: "15:00", endTime: "16:30", location: "Psychology Building 201" }
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