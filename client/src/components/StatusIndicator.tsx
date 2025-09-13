import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import studyIcon from "@assets/study_status_1757730011820.png";
import freeIcon from "@assets/free_status_1757730011817.png";
import inClassIcon from "@assets/in_class_status_1757730011818.png";
import tiredIcon from "@assets/tired_status_1757731273641.jpg";
import socialIcon from "@assets/social_status_1757731273641.jpg";
import busyIcon from "@assets/busy_status_1757731277664.jpg";

type StatusType = "studying" | "free" | "in_class" | "busy" | "tired" | "social";

interface StatusIndicatorProps {
  status: StatusType;
  size?: "sm" | "default" | "lg";
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
}

const statusConfig: Record<StatusType, { 
  label: string; 
  color: string;
  icon: string;
}> = {
  studying: { label: "Studying", color: "bg-status-studying text-white", icon: studyIcon },
  free: { label: "Free", color: "bg-status-free text-white", icon: freeIcon },
  in_class: { label: "In Class", color: "bg-status-help text-white", icon: inClassIcon },
  busy: { label: "Busy", color: "bg-status-busy text-white", icon: busyIcon },
  tired: { label: "Tired", color: "bg-status-tired text-white", icon: tiredIcon },
  social: { label: "Social", color: "bg-status-social text-white", icon: socialIcon },
};

const sizeConfig = {
  sm: {
    badge: "px-2 py-1 text-xs gap-1",
    icon: "h-3 w-3",
  },
  default: {
    badge: "px-3 py-1.5 text-sm gap-1.5",
    icon: "h-4 w-4",
  },
  lg: {
    badge: "px-4 py-2 text-base gap-2",
    icon: "h-5 w-5",
  },
};

export default function StatusIndicator({ 
  status, 
  size = "default", 
  className,
  showIcon = true,
  showLabel = true
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        config.color, 
        sizeStyles.badge,
        "flex items-center justify-center",
        className
      )}
      data-testid={`status-${status}`}
    >
      {showIcon && (
        <img 
          src={config.icon} 
          alt={config.label}
          className={cn(sizeStyles.icon, "object-contain")} 
        />
      )}
      {showLabel && (
        <span className="font-medium whitespace-nowrap">{config.label}</span>
      )}
    </Badge>
  );
}