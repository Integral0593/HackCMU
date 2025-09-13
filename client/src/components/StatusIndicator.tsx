import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "studying" | "free" | "in_class" | "busy" | "tired" | "social";

interface StatusIndicatorProps {
  status: StatusType;
  size?: "sm" | "default" | "lg";
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; color: string }> = {
  studying: { label: "Studying", color: "bg-status-studying text-white" },
  free: { label: "Free", color: "bg-status-free text-white" },
  in_class: { label: "In Class", color: "bg-status-help text-white" },
  busy: { label: "Busy", color: "bg-status-busy text-white" },
  tired: { label: "Tired", color: "bg-status-tired text-white" },
  social: { label: "Social", color: "bg-status-social text-white" },
};

export default function StatusIndicator({ status, size = "default", className }: StatusIndicatorProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="secondary" 
      className={cn(config.color, className)}
      data-testid={`status-${status}`}
    >
      {config.label}
    </Badge>
  );
}