import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  type AppointmentSlot,
  type UserScheduleWithUser,
  type InsertSchedule
} from "@shared/schema";
import { Calendar, Clock, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TimeGridProps {
  userSchedules: UserScheduleWithUser[];
  selectedFriends: string[];
  duration: number; // in minutes
  timeRange: {
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format  
  };
  selectedDays: string[];
  onCreateEvent?: (event: InsertSchedule) => void;
  className?: string;
}

interface TimeSlot {
  day: string;
  time: string;
  availableUsers: string[];
  isFullyAvailable: boolean;
  canFitDuration: boolean;
}

interface SelectionRange {
  startDay: string;
  startTime: string;
  endDay: string;
  endTime: string;
}

const dayLabels = {
  monday: "Monday",
  tuesday: "Tuesday", 
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday"
};

const dayShorts = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed", 
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun"
};

export default function TimeGrid({
  userSchedules,
  selectedFriends,
  duration,
  timeRange,
  selectedDays,
  onCreateEvent,
  className
}: TimeGridProps) {
  const [selectedRange, setSelectedRange] = useState<SelectionRange | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const { toast } = useToast();

  // Generate time slots (30-minute intervals)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const start = new Date(`2000-01-01T${timeRange.startTime}:00`);
    const end = new Date(`2000-01-01T${timeRange.endTime}:00`);
    
    const current = new Date(start);
    while (current < end) {
      slots.push(current.toTimeString().slice(0, 5));
      current.setMinutes(current.getMinutes() + 30);
    }
    
    return slots;
  }, [timeRange]);

  // Convert schedule to busy intervals
  const getBusyIntervals = useCallback((schedule: UserScheduleWithUser['schedules'][0]) => {
    return schedule.days.map(day => ({
      day,
      startTime: schedule.startTime,
      endTime: schedule.endTime
    }));
  }, []);

  // Check if user is busy at specific time
  const isUserBusy = useCallback((userId: string, day: string, time: string) => {
    const userSchedule = userSchedules.find(us => us.userId === userId);
    if (!userSchedule) return false;

    return userSchedule.schedules.some(schedule => {
      const intervals = getBusyIntervals(schedule);
      return intervals.some(interval => 
        interval.day === day && 
        time >= interval.startTime && 
        time < interval.endTime
      );
    });
  }, [userSchedules, getBusyIntervals]);

  // Generate availability grid
  const availabilityGrid = useMemo(() => {
    const grid: Record<string, Record<string, TimeSlot>> = {};
    
    selectedDays.forEach(day => {
      grid[day] = {};
      timeSlots.forEach(time => {
        const availableUsers = userSchedules
          .filter(us => selectedFriends.includes(us.userId))
          .filter(us => !isUserBusy(us.userId, day, time))
          .map(us => us.userId);
        
        const isFullyAvailable = availableUsers.length === selectedFriends.length;
        
        // Check if this slot can fit the required duration
        const timeIndex = timeSlots.indexOf(time);
        const slotsNeeded = Math.ceil(duration / 30);
        const canFitDuration = timeIndex + slotsNeeded <= timeSlots.length &&
          Array.from({ length: slotsNeeded }, (_, i) => timeIndex + i)
            .every(index => {
              if (index >= timeSlots.length) return false;
              const checkTime = timeSlots[index];
              const checkAvailableUsers = userSchedules
                .filter(us => selectedFriends.includes(us.userId))
                .filter(us => !isUserBusy(us.userId, day, checkTime))
                .map(us => us.userId);
              return checkAvailableUsers.length === selectedFriends.length;
            });

        grid[day][time] = {
          day,
          time,
          availableUsers,
          isFullyAvailable,
          canFitDuration: isFullyAvailable && canFitDuration
        };
      });
    });
    
    return grid;
  }, [selectedDays, timeSlots, userSchedules, selectedFriends, duration, isUserBusy]);

  const handleSlotClick = (day: string, time: string) => {
    const slot = availabilityGrid[day][time];
    if (!slot.canFitDuration) return;

    // Calculate end time based on duration
    const startTimeIndex = timeSlots.indexOf(time);
    const slotsNeeded = Math.ceil(duration / 30);
    const endTimeIndex = startTimeIndex + slotsNeeded;
    const endTime = endTimeIndex < timeSlots.length 
      ? timeSlots[endTimeIndex] 
      : timeSlots[timeSlots.length - 1];

    setSelectedRange({
      startDay: day,
      startTime: time,
      endDay: day,
      endTime: endTime
    });
    setIsCreateEventOpen(true);
  };

  const handleCreateEvent = () => {
    if (!selectedRange || !eventTitle.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter an event title.",
        variant: "destructive"
      });
      return;
    }

    const newEvent: InsertSchedule = {
      courseCode: `EVENT-${Date.now()}`,
      courseName: eventTitle.trim(),
      days: [selectedRange.startDay],
      startTime: selectedRange.startTime,
      endTime: selectedRange.endTime,
      location: eventLocation.trim() || undefined
    };

    onCreateEvent?.(newEvent);
    setIsCreateEventOpen(false);
    setEventTitle("");
    setEventLocation("");
    setSelectedRange(null);
    
    toast({
      title: "Event created",
      description: `"${eventTitle}" has been added to your schedule.`
    });
  };

  const formatTime12Hour = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getAvailabilityColor = (slot: TimeSlot) => {
    if (!slot.isFullyAvailable) {
      return "bg-red-800 hover:bg-red-900 dark:bg-red-900 dark:hover:bg-red-800";
    }
    return slot.canFitDuration 
      ? "bg-white hover:bg-gray-50 dark:bg-white dark:hover:bg-gray-100 border border-gray-200" 
      : "bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-800 dark:hover:bg-yellow-700";
  };

  const getAvailabilityText = (slot: TimeSlot) => {
    if (!slot.isFullyAvailable) {
      return `${slot.availableUsers.length}/${selectedFriends.length} available`;
    }
    return slot.canFitDuration ? "Available" : "Too short";
  };

  return (
    <div className={cn("w-full", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Common Available Times
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {duration} min duration
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-200 dark:bg-green-800 rounded border"></div>
              <span className="text-sm">Available ({duration}min fit)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-800 rounded border"></div>
              <span className="text-sm">Available (too short)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded border"></div>
              <span className="text-sm">Partially available</span>
            </div>
          </div>

          {/* Participants */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Participants ({selectedFriends.length + 1})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {userSchedules
                .filter(us => selectedFriends.includes(us.userId) || us.userId === 'current')
                .map(user => (
                  <div key={user.userId} className="flex items-center gap-2 px-2 py-1 bg-muted rounded">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.fullName?.[0] || user.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.fullName || user.username}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Time Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-[100px_repeat(7,_1fr)] gap-1 mb-2">
                <div className="p-2 text-center text-sm font-medium">Time</div>
                {selectedDays.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium">
                    <div className="hidden sm:block">{dayLabels[day as keyof typeof dayLabels]}</div>
                    <div className="sm:hidden">{dayShorts[day as keyof typeof dayShorts]}</div>
                  </div>
                ))}
              </div>

              {/* Grid Body */}
              {timeSlots.map((time, timeIndex) => (
                <div key={time} className="grid grid-cols-[100px_repeat(7,_1fr)] gap-1 mb-1">
                  <div className="p-2 text-center text-xs bg-muted/30 rounded flex items-center justify-center">
                    {formatTime12Hour(time)}
                  </div>
                  {selectedDays.map(day => {
                    const slot = availabilityGrid[day][time];
                    return (
                      <div
                        key={`${day}-${time}`}
                        className={cn(
                          "h-8 rounded border cursor-pointer transition-all duration-200 flex items-center justify-center text-xs relative group",
                          getAvailabilityColor(slot),
                          slot.canFitDuration && "hover:scale-105 hover:z-10"
                        )}
                        onClick={() => handleSlotClick(day, time)}
                        data-testid={`time-slot-${day}-${time}`}
                        title={getAvailabilityText(slot)}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap">
                          {getAvailabilityText(slot)}
                        </div>
                        
                        {slot.isFullyAvailable && slot.canFitDuration && (
                          <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {selectedDays.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select days to view availability</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Event Dialog */}
      <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
        <DialogContent data-testid="create-event-dialog">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRange && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm"><strong>Day:</strong> {dayLabels[selectedRange.startDay as keyof typeof dayLabels]}</p>
                <p className="text-sm"><strong>Time:</strong> {formatTime12Hour(selectedRange.startTime)} - {formatTime12Hour(selectedRange.endTime)}</p>
                <p className="text-sm"><strong>Duration:</strong> {duration} minutes</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Event Title *</label>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter event title"
                data-testid="event-title-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Location (optional)</label>
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter location"
                data-testid="event-location-input"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateEventOpen(false)}
                data-testid="cancel-event"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateEvent}
                disabled={!eventTitle.trim()}
                data-testid="create-event-button"
              >
                Create Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}