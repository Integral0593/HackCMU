import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  BookOpen, 
  Coffee, 
  Heart, 
  Clock, 
  Moon, 
  Users2 
} from "lucide-react";

type StatusType = "studying" | "free" | "help" | "busy" | "tired" | "social";

interface StatusButtonsProps {
  currentStatus: StatusType;
  onStatusChange: (status: StatusType) => void;
  className?: string;
}

const statusConfig: Record<StatusType, { 
  label: string; 
  icon: React.ElementType;
  color: string;
}> = {
  studying: { label: "Studying", icon: BookOpen, color: "text-status-studying" },
  free: { label: "Free", icon: Coffee, color: "text-status-free" },
  help: { label: "Can Help", icon: Heart, color: "text-status-help" },
  busy: { label: "Busy", icon: Clock, color: "text-status-busy" },
  tired: { label: "Tired", icon: Moon, color: "text-status-tired" },
  social: { label: "Social", icon: Users2, color: "text-status-social" },
};

export default function StatusButtons({ 
  currentStatus, 
  onStatusChange, 
  className 
}: StatusButtonsProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-2", className)}>
      {Object.entries(statusConfig).map(([status, config]) => {
        const Icon = config.icon;
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
            <Icon className={cn(
              "h-4 w-4", 
              isActive ? "text-primary-foreground" : config.color
            )} />
            <span className="text-sm font-medium">{config.label}</span>
          </Button>
        );
      })}
    </div>
  );
}