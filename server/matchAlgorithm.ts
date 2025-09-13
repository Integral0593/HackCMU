// Match Algorithm Implementation based on MVP specification
import { StudyPartner } from "@shared/schema";

// Configuration weights as specified
const WEIGHTS = {
  shared_course: 10,
  help: 6,
  busy_tired: -4,
  same_major: 3,
  same_location: 2,
  same_current_class: 15,  // Enhanced feature
  same_next_class: 10      // Enhanced feature
};

// Course code normalization function
export function normalizeCourseCode(courseCode: string): string {
  if (!courseCode) return '';
  // Extract numeric part - handles cases like "CS 10301", "10301 A", "：： 12345 1"
  const match = courseCode.match(/\d{4,6}/);
  return match ? match[0] : courseCode.trim().toUpperCase();
}

// Time utility functions
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isBetween(now: number, start: string, end: string): boolean {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  return now >= startMinutes && now < endMinutes; // [start, end)
}

// Availability functions
export function getCurrentClassFor(schedules: any[], now: Date): any | null {
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5);
  const currentMinutes = timeToMinutes(currentTime);

  for (const schedule of schedules) {
    if (schedule.days.includes(currentDay)) {
      if (isBetween(currentMinutes, schedule.startTime, schedule.endTime)) {
        return schedule;
      }
    }
  }
  return null;
}

export function getNextClassFor(schedules: any[], now: Date): any | null {
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5);
  const currentMinutes = timeToMinutes(currentTime);

  // Find today's schedules after current time
  const todaySchedules = schedules.filter(s => s.days.includes(currentDay));
  const futureSchedules = todaySchedules.filter(s => timeToMinutes(s.startTime) > currentMinutes);
  
  if (futureSchedules.length > 0) {
    // Return the earliest one
    return futureSchedules.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))[0];
  }
  
  return null;
}

// Main matching algorithm
export async function getStudyPartners(
  snapshot: {
    users: Map<string, any>,
    schedules: Map<string, any[]>, 
    statuses: Map<string, any>
  },
  userId: string,
  now: Date = new Date(),
  topN: number = 5
): Promise<StudyPartner[]> {
  
  const currentUser = snapshot.users.get(userId);
  if (!currentUser) return [];

  const currentUserSchedules = snapshot.schedules.get(userId) || [];
  const currentUserCourses = new Set(
    currentUserSchedules.map(s => normalizeCourseCode(s.courseCode))
  );
  const currentUserStatus = snapshot.statuses.get(userId);
  
  console.log(`[MatchAlgorithm] User ${userId} has ${currentUserCourses.size} normalized courses: ${Array.from(currentUserCourses).join(', ')}`);
  console.log(`[MatchAlgorithm] User ${userId} status:`, currentUserStatus);

  // Check if current user is free (not in class)
  const currentUserInClass = getCurrentClassFor(currentUserSchedules, now);
  if (currentUserInClass) {
    return []; // Current user is in class, no recommendations
  }

  const candidates: StudyPartner[] = [];

  // Generate candidate set (filters)
  for (const [otherUserId, otherUser] of Array.from(snapshot.users.entries())) {
    if (otherUserId === userId) continue; // Skip self

    const otherUserSchedules = snapshot.schedules.get(otherUserId) || [];
    const otherUserCourses = new Set(
      otherUserSchedules.map(s => normalizeCourseCode(s.courseCode))
    );
    const otherUserStatus = snapshot.statuses.get(otherUserId);
    
    // Check for at least 1 shared class
    const sharedCourses = Array.from(currentUserCourses).filter(course => 
      otherUserCourses.has(course)
    );
    
    console.log(`[MatchAlgorithm] Checking user ${otherUser.username}: ${otherUserCourses.size} courses, ${sharedCourses.length} shared`);
    
    if (sharedCourses.length === 0) continue;

    // Check if other user is also free (not in class)
    const otherUserInClass = getCurrentClassFor(otherUserSchedules, now);
    if (otherUserInClass) continue; // Other user is in class

    // Both users are free and have shared classes - proceed to scoring
    let score = 0;
    let reasons: string[] = [];

    // 1. Shared courses score (+10 per shared course)
    score += sharedCourses.length * WEIGHTS.shared_course;
    reasons.push(`Shares ${sharedCourses.length} class${sharedCourses.length > 1 ? 'es' : ''}`);

    // 2. Status compatibility
    const otherManualStatus = otherUserStatus?.status || 'free';
    if (otherManualStatus === 'help') {
      score += WEIGHTS.help;
      reasons.push('Willing to help');
    } else if (otherManualStatus === 'busy' || otherManualStatus === 'tired') {
      score += WEIGHTS.busy_tired; // This is negative
    }

    // 3. Same major bonus
    if (currentUser.major === otherUser.major) {
      score += WEIGHTS.same_major;
      reasons.push('Same major');
    }

    // 4. Location proximity (if available)
    // Note: This is simplified - in real implementation, you'd have location data
    // For now, we skip this enhancement

    // 5. Enhanced features (optional)
    const currentUserNextClass = getNextClassFor(currentUserSchedules, now);
    const otherUserNextClass = getNextClassFor(otherUserSchedules, now);
    
    if (currentUserNextClass && otherUserNextClass) {
      if (currentUserNextClass.courseCode === otherUserNextClass.courseCode) {
        score += WEIGHTS.same_next_class;
        reasons.push(`Next class together: ${currentUserNextClass.courseCode}`);
      }
    }

    // Only include candidates with positive scores
    if (score > 0) {
      // Generate reason string
      let reason = reasons.slice(0, 2).join('; '); // Take first 2 reasons
      reason += '; Both free now'; // Always append this as per spec

      candidates.push({
        id: otherUser.id,
        username: otherUser.username,
        fullName: otherUser.fullName,
        major: otherUser.major,
        grade: otherUser.grade,
        bio: otherUser.bio,
        avatar: otherUser.avatar,
        score,
        shared_classes: sharedCourses,
        current_class: undefined, // Both are free
        next_class: otherUserNextClass ? `${otherUserNextClass.courseCode} @ ${otherUserNextClass.startTime}` : undefined,
        reason
      });
    }
  }

  // Sort by score (descending) then by username (ascending) for stable sort
  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.username.localeCompare(b.username);
  });

  // Return top N candidates
  return candidates.slice(0, topN);
}