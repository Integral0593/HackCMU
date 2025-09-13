import { 
  type Schedule, 
  type UserScheduleWithUser, 
  type AppointmentSlot,
  type AvailabilitySlot,
  type TimeSlot
} from "@shared/schema";

// Time utility functions
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const addMinutesToTime = (time: string, minutesToAdd: number): string => {
  const totalMinutes = timeToMinutes(time) + minutesToAdd;
  return minutesToTime(totalMinutes);
};

export const isTimeInRange = (time: string, startTime: string, endTime: string): boolean => {
  const timeMin = timeToMinutes(time);
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  return timeMin >= startMin && timeMin < endMin;
};

// Generate 30-minute time slots within a range
export const generateTimeSlots = (startTime: string, endTime: string, intervalMinutes: number = 30): string[] => {
  const slots: string[] = [];
  let currentMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  while (currentMinutes < endMinutes) {
    slots.push(minutesToTime(currentMinutes));
    currentMinutes += intervalMinutes;
  }
  
  return slots;
};

// Convert schedule to busy time intervals for a specific day
export const getScheduleBusyIntervals = (schedule: Schedule): TimeSlot[] => {
  return schedule.days.map(day => ({
    day,
    startTime: schedule.startTime,
    endTime: schedule.endTime
  }));
};

// Check if a user is busy at a specific time slot
export const isUserBusyAtTime = (userSchedule: UserScheduleWithUser, day: string, time: string): boolean => {
  return userSchedule.schedules.some(schedule => {
    const intervals = getScheduleBusyIntervals(schedule);
    return intervals.some(interval => 
      interval.day === day && 
      isTimeInRange(time, interval.startTime, interval.endTime)
    );
  });
};

// Get all users who are available at a specific time slot
export const getAvailableUsers = (
  userSchedules: UserScheduleWithUser[], 
  day: string, 
  time: string
): string[] => {
  return userSchedules
    .filter(us => !isUserBusyAtTime(us, day, time))
    .map(us => us.userId);
};

// Check if all selected users are available at a time slot
export const areAllUsersAvailable = (
  userSchedules: UserScheduleWithUser[], 
  selectedUserIds: string[],
  day: string, 
  time: string
): boolean => {
  const availableUsers = getAvailableUsers(userSchedules, day, time);
  return selectedUserIds.every(userId => availableUsers.includes(userId));
};

// Check if a time slot can accommodate the required duration
export const canSlotFitDuration = (
  userSchedules: UserScheduleWithUser[],
  selectedUserIds: string[],
  day: string,
  startTime: string,
  durationMinutes: number,
  timeSlots: string[]
): boolean => {
  const startIndex = timeSlots.indexOf(startTime);
  if (startIndex === -1) return false;

  const slotsNeeded = Math.ceil(durationMinutes / 30);
  
  // Check if we have enough slots remaining
  if (startIndex + slotsNeeded > timeSlots.length) return false;

  // Check if all required slots are available for all users
  for (let i = 0; i < slotsNeeded; i++) {
    const slotIndex = startIndex + i;
    if (slotIndex >= timeSlots.length) return false;
    
    const slotTime = timeSlots[slotIndex];
    if (!areAllUsersAvailable(userSchedules, selectedUserIds, day, slotTime)) {
      return false;
    }
  }

  return true;
};

// Generate availability slots for all time slots and days
export const generateAvailabilitySlots = (
  userSchedules: UserScheduleWithUser[],
  selectedUserIds: string[],
  days: string[],
  timeRange: { startTime: string; endTime: string },
  durationMinutes: number
): Record<string, Record<string, AvailabilitySlot>> => {
  const timeSlots = generateTimeSlots(timeRange.startTime, timeRange.endTime);
  const availability: Record<string, Record<string, AvailabilitySlot>> = {};

  days.forEach(day => {
    availability[day] = {};
    
    timeSlots.forEach(time => {
      const availableUsers = getAvailableUsers(userSchedules, day, time);
      const isFullyAvailable = selectedUserIds.every(userId => availableUsers.includes(userId));
      
      availability[day][time] = {
        day,
        startTime: time,
        endTime: addMinutesToTime(time, 30),
        isAvailable: isFullyAvailable,
        users: availableUsers
      };
    });
  });

  return availability;
};

// Find all appointment slots that can accommodate the duration
export const findAppointmentSlots = (
  userSchedules: UserScheduleWithUser[],
  selectedUserIds: string[],
  days: string[],
  timeRange: { startTime: string; endTime: string },
  durationMinutes: number
): AppointmentSlot[] => {
  const timeSlots = generateTimeSlots(timeRange.startTime, timeRange.endTime);
  const appointmentSlots: AppointmentSlot[] = [];

  days.forEach(day => {
    timeSlots.forEach(startTime => {
      const canFit = canSlotFitDuration(
        userSchedules, 
        selectedUserIds, 
        day, 
        startTime, 
        durationMinutes, 
        timeSlots
      );

      if (canFit) {
        const availableUsers = getAvailableUsers(userSchedules, day, startTime);
        const endTime = addMinutesToTime(startTime, durationMinutes);
        
        appointmentSlots.push({
          day,
          startTime,
          endTime,
          availableUsers,
          isFullyAvailable: selectedUserIds.every(userId => availableUsers.includes(userId))
        });
      }
    });
  });

  return appointmentSlots;
};

// Format time for display (12-hour format)
export const formatTimeForDisplay = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

// Get day name from day key
export const getDayName = (day: string): string => {
  const dayNames: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday", 
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday"
  };
  return dayNames[day] || day;
};

// Get short day name from day key
export const getShortDayName = (day: string): string => {
  const dayNames: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed", 
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun"
  };
  return dayNames[day] || day.slice(0, 3);
};

// Calculate availability percentage for a time slot
export const getAvailabilityPercentage = (
  availableUsers: string[], 
  totalUsers: string[]
): number => {
  if (totalUsers.length === 0) return 0;
  return Math.round((availableUsers.length / totalUsers.length) * 100);
};

// Group appointment slots by day for easier display
export const groupAppointmentSlotsByDay = (
  slots: AppointmentSlot[]
): Record<string, AppointmentSlot[]> => {
  return slots.reduce((groups, slot) => {
    if (!groups[slot.day]) {
      groups[slot.day] = [];
    }
    groups[slot.day].push(slot);
    return groups;
  }, {} as Record<string, AppointmentSlot[]>);
};

// Sort appointment slots by day and time
export const sortAppointmentSlots = (slots: AppointmentSlot[]): AppointmentSlot[] => {
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  return slots.sort((a, b) => {
    // First sort by day
    const dayA = dayOrder.indexOf(a.day);
    const dayB = dayOrder.indexOf(b.day);
    
    if (dayA !== dayB) {
      return dayA - dayB;
    }
    
    // Then sort by start time
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });
};

// Merge consecutive time slots into longer appointment slots
export const mergeConsecutiveSlots = (
  slots: AppointmentSlot[], 
  maxDurationMinutes: number = 480 // 8 hours max
): AppointmentSlot[] => {
  if (slots.length === 0) return [];
  
  const sortedSlots = sortAppointmentSlots(slots);
  const merged: AppointmentSlot[] = [];
  let current = { ...sortedSlots[0] };
  
  for (let i = 1; i < sortedSlots.length; i++) {
    const next = sortedSlots[i];
    
    // Check if slots are consecutive (same day, adjacent times, same users)
    const isConsecutive = 
      current.day === next.day &&
      current.endTime === next.startTime &&
      current.availableUsers.length === next.availableUsers.length &&
      current.availableUsers.every(user => next.availableUsers.includes(user));
    
    // Check if merging would exceed max duration
    const currentDuration = timeToMinutes(current.endTime) - timeToMinutes(current.startTime);
    const nextDuration = timeToMinutes(next.endTime) - timeToMinutes(next.startTime);
    const totalDuration = currentDuration + nextDuration;
    
    if (isConsecutive && totalDuration <= maxDurationMinutes) {
      current.endTime = next.endTime;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  
  merged.push(current);
  return merged;
};

export default {
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  isTimeInRange,
  generateTimeSlots,
  getScheduleBusyIntervals,
  isUserBusyAtTime,
  getAvailableUsers,
  areAllUsersAvailable,
  canSlotFitDuration,
  generateAvailabilitySlots,
  findAppointmentSlots,
  formatTimeForDisplay,
  getDayName,
  getShortDayName,
  getAvailabilityPercentage,
  groupAppointmentSlotsByDay,
  sortAppointmentSlots,
  mergeConsecutiveSlots
};