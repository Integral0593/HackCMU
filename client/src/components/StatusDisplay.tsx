import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Schedule } from "@shared/schema";
import studyIcon from "@assets/study_status_1757730011820.png";
import freeIcon from "@assets/free_status_1757730011817.png";
import inClassIcon from "@assets/in_class_status_1757730011818.png";
import tiredIcon from "@assets/tired_status_1757731273641.jpg";
import socialIcon from "@assets/social_status_1757731273641.jpg";
import busyIcon from "@assets/busy_status_1757731277664.jpg";

type StatusType = "studying" | "free" | "in_class" | "busy" | "tired" | "social";

interface StatusDisplayProps {
  currentStatus: StatusType | null;
  currentMessage?: string;
  onStatusChange: (status: StatusType, customMessage?: string) => void;
  schedules: Schedule[];
  className?: string;
}

interface CurrentClass {
  courseCode: string;
  courseName: string;
  location: string | null;
  endTime: string;
}

interface NextClass {
  courseCode: string;
  courseName: string;
  location: string | null;
  startTime: string;
  minutesUntil: number;
}

const statusConfig: Record<StatusType, { 
  label: string; 
  icon: string;
  color: string;
  message: string;
}> = {
  studying: { label: "Studying", icon: studyIcon, color: "text-status-studying", message: "Focused on studying" },
  free: { label: "Free", icon: freeIcon, color: "text-status-free", message: "Available for study partners" },
  in_class: { label: "In Class", icon: inClassIcon, color: "text-status-help", message: "Currently in class" },
  busy: { label: "Busy", icon: busyIcon, color: "text-status-busy", message: "Busy with other tasks" },
  tired: { label: "Tired", icon: tiredIcon, color: "text-status-tired", message: "Taking a break" },
  social: { label: "Social", icon: socialIcon, color: "text-status-social", message: "Hanging out with friends" },
};

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function getCurrentDayName(): string {
  const today = new Date();
  return DAYS[today.getDay()];
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function timeToMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

function getCurrentTimeInMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function findCurrentClass(schedules: Schedule[]): CurrentClass | null {
  const currentDay = getCurrentDayName();
  const currentTimeMinutes = getCurrentTimeInMinutes();
  
  const todaysClasses = schedules.filter(schedule => schedule.day === currentDay);
  
  for (const schedule of todaysClasses) {
    const startTime = timeToMinutes(schedule.startTime);
    const endTime = timeToMinutes(schedule.endTime);
    
    if (currentTimeMinutes >= startTime && currentTimeMinutes < endTime) {
      return {
        courseCode: schedule.courseCode,
        courseName: schedule.courseName,
        location: schedule.location,
        endTime: schedule.endTime
      };
    }
  }
  
  return null;
}

function findNextClass(schedules: Schedule[]): NextClass | null {
  const currentDay = getCurrentDayName();
  const currentTimeMinutes = getCurrentTimeInMinutes();
  
  const todaysClasses = schedules.filter(schedule => schedule.day === currentDay);
  
  // Find classes that start after current time
  const upcomingClasses = todaysClasses
    .filter(schedule => timeToMinutes(schedule.startTime) > currentTimeMinutes)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  
  if (upcomingClasses.length > 0) {
    const nextClass = upcomingClasses[0];
    const minutesUntil = timeToMinutes(nextClass.startTime) - currentTimeMinutes;
    
    // Only return if class is within the next hour
    if (minutesUntil <= 60) {
      return {
        courseCode: nextClass.courseCode,
        courseName: nextClass.courseName,
        location: nextClass.location,
        startTime: nextClass.startTime,
        minutesUntil
      };
    }
  }
  
  return null;
}

function getSmartStatus(schedules: Schedule[]): { status: StatusType; message: string } {
  const currentClass = findCurrentClass(schedules);
  
  if (currentClass) {
    return {
      status: "in_class",
      message: `You are taking ${currentClass.courseCode} ${currentClass.courseName}${currentClass.location ? ` in ${currentClass.location}` : ''}. Class ends at ${currentClass.endTime}`
    };
  }
  
  const nextClass = findNextClass(schedules);
  
  if (nextClass) {
    return {
      status: "free",
      message: `Free - Next class ${nextClass.courseCode} in ${nextClass.minutesUntil} minutes`
    };
  }
  
  return {
    status: "free",
    message: "Free - No upcoming classes today"
  };
}

export default function StatusDisplay({ 
  currentStatus, 
  currentMessage,
  onStatusChange, 
  schedules,
  className 
}: StatusDisplayProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<StatusType | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  
  const smartStatus = getSmartStatus(schedules);
  const effectiveStatus = currentStatus || smartStatus.status;
  const currentConfig = statusConfig[effectiveStatus];
  
  // Determine the message to display (priority: custom message > manual status message > smart status message)
  const displayMessage = currentMessage || (currentStatus ? currentConfig.message : smartStatus.message);
  
  const handleStatusChange = (newStatus: StatusType) => {
    // If currently in class and trying to change, show confirmation
    if (effectiveStatus === "in_class" && newStatus !== "in_class") {
      setPendingStatus(newStatus);
      setShowConfirmDialog(true);
    } else {
      const message = useCustomMessage && customMessage.trim() ? customMessage.trim() : undefined;
      onStatusChange(newStatus, message);
    }
  };
  
  const confirmStatusChange = () => {
    if (pendingStatus) {
      const message = useCustomMessage && customMessage.trim() ? customMessage.trim() : undefined;
      onStatusChange(pendingStatus, message);
      setPendingStatus(null);
    }
    setShowConfirmDialog(false);
  };
  
  const cancelStatusChange = () => {
    setPendingStatus(null);
    setShowConfirmDialog(false);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="pt-6">
        {/* Large centered status image */}
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="mb-3 sm:mb-4">
            <img 
              src={currentConfig.icon} 
              alt={currentConfig.label}
              className="h-20 w-20 sm:h-28 sm:w-28 md:h-32 md:w-32 object-contain" 
            />
          </div>
          
          {/* Status message */}
          <div className="text-center mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">{currentConfig.label}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground px-2">
              {displayMessage}
            </p>
          </div>
        </div>

        {/* Custom message input */}
        <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useCustomMessage"
              checked={useCustomMessage}
              onChange={(e) => setUseCustomMessage(e.target.checked)}
              className="rounded border-gray-300"
              data-testid="checkbox-custom-message"
            />
            <Label htmlFor="useCustomMessage" className="text-xs sm:text-sm font-medium">
              Add custom message
            </Label>
          </div>
          
          {useCustomMessage && (
            <div className="space-y-2">
              <Label htmlFor="customMessage" className="text-xs sm:text-sm">
                Custom Status Message
              </Label>
              <Input
                id="customMessage"
                placeholder="Enter your custom status message..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                maxLength={100}
                className="text-xs sm:text-sm"
                data-testid="input-custom-message"
              />
              <p className="text-xs text-muted-foreground">
                {customMessage.length}/100 characters
              </p>
            </div>
          )}
        </div>

        {/* Status selection buttons */}
        <div className="space-y-2">
          <p className="text-xs sm:text-sm font-medium text-center mb-2 sm:mb-3">Change Status:</p>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(statusConfig).map(([status, config]) => {
              const isActive = effectiveStatus === status;
              
              return (
                <Button
                  key={status}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusChange(status as StatusType)}
                  className={cn(
                    "flex items-center justify-center gap-2 h-auto py-2 px-3 min-h-[44px]",
                    !isActive && "hover:bg-accent"
                  )}
                  data-testid={`status-button-${status}`}
                >
                  <img 
                    src={config.icon} 
                    alt={config.label}
                    className="h-3 w-3 sm:h-4 sm:w-4" 
                  />
                  <span className="text-xs sm:text-sm font-medium">{config.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent data-testid="status-change-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Scotty thinks you are in class right now, are you sure to change your status?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelStatusChange} data-testid="confirm-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange} data-testid="confirm-change">
              Yes, Change Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}