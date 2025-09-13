import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import studyIcon from "@assets/study_status_1757730011820.png";
import freeIcon from "@assets/free_status_1757730011817.png";
import inClassIcon from "@assets/in_class_status_1757730011818.png";
import tiredIcon from "@assets/tired_status_1757731273641.jpg";
import socialIcon from "@assets/social_status_1757731273641.jpg";
import busyIcon from "@assets/busy_status_1757731277664.jpg";

type StatusType = "studying" | "free" | "in_class" | "busy" | "tired" | "social";

interface StatusButtonsProps {
  currentStatus: StatusType;
  onStatusChange: (status: StatusType) => void;
  className?: string;
}

const statusConfig: Record<StatusType, { 
  label: string; 
  icon: string;
  color: string;
}> = {
  studying: { label: "Studying", icon: studyIcon, color: "text-status-studying" },
  free: { label: "Free", icon: freeIcon, color: "text-status-free" },
  in_class: { label: "In Class", icon: inClassIcon, color: "text-status-help" },
  busy: { label: "Busy", icon: busyIcon, color: "text-status-busy" },
  tired: { label: "Tired", icon: tiredIcon, color: "text-status-tired" },
  social: { label: "Social", icon: socialIcon, color: "text-status-social" },
};

export default function StatusButtons({ 
  currentStatus, 
  onStatusChange, 
  className 
}: StatusButtonsProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-2", className)}>
      {Object.entries(statusConfig).map(([status, config]) => {
        const isActive = currentStatus === status;
        
        return (
          <Button
            key={status}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusChange(status as StatusType)}
            className={cn(
              "flex items-center gap-2 h-auto py-3",
              !isActive && "hover:bg-accent"
            )}
            data-testid={`status-button-${status}`}
          >
            <img 
              src={config.icon} 
              alt={config.label}
              className="h-4 w-4" 
            />
            <span className="text-sm font-medium">{config.label}</span>
          </Button>
        );
      })}
    </div>
  );
}