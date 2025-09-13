import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  appointmentDurations, 
  type AppointmentDuration,
  type FriendWithUser,
  type UserScheduleWithUser,
  dayEnum
} from "@shared/schema";
import { Calendar, Clock, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AppointmentDialogProps {
  trigger: React.ReactNode;
  friends: FriendWithUser[];
  onFindTimes: (selectedFriends: string[], duration: number, timeRange: { startTime: string; endTime: string }, days: string[]) => void;
  isLoading?: boolean;
}

const days = [
  { value: "monday" as const, label: "Monday", short: "Mon" },
  { value: "tuesday" as const, label: "Tuesday", short: "Tue" },
  { value: "wednesday" as const, label: "Wednesday", short: "Wed" },
  { value: "thursday" as const, label: "Thursday", short: "Thu" },
  { value: "friday" as const, label: "Friday", short: "Fri" },
  { value: "saturday" as const, label: "Saturday", short: "Sat" },
  { value: "sunday" as const, label: "Sunday", short: "Sun" },
];

export default function AppointmentDialog({ trigger, friends, onFindTimes, isLoading = false }: AppointmentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [duration, setDuration] = useState<AppointmentDuration>(60);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("22:00");
  const [selectedDays, setSelectedDays] = useState<string[]>(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  const { toast } = useToast();

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFriends([]);
      setDuration(60);
      setStartTime("08:00");
      setEndTime("22:00");
      setSelectedDays(["monday", "tuesday", "wednesday", "thursday", "friday"]);
    }
  }, [isOpen]);

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleDayToggle = (dayValue: string) => {
    setSelectedDays(prev =>
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const handleSelectAllFriends = () => {
    // Deduplicate friends first
    const uniqueFriends = new Map();
    friends.forEach((friendWithUser) => {
      const friendKey = friendWithUser.friend.id;
      if (!uniqueFriends.has(friendKey)) {
        uniqueFriends.set(friendKey, friendWithUser);
      }
    });
    const uniqueFriendsArray = Array.from(uniqueFriends.values());
    
    if (selectedFriends.length === uniqueFriendsArray.length) {
      setSelectedFriends([]);
    } else {
      setSelectedFriends(uniqueFriendsArray.map(f => f.friend.id));
    }
  };

  const handleSelectWorkdays = () => {
    setSelectedDays(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  };

  const handleSelectWeekend = () => {
    setSelectedDays(["saturday", "sunday"]);
  };

  const handleSelectAllDays = () => {
    if (selectedDays.length === 7) {
      setSelectedDays([]);
    } else {
      setSelectedDays(days.map(d => d.value));
    }
  };

  const handleFindTimes = () => {
    if (selectedFriends.length === 0) {
      toast({
        title: "No friends selected",
        description: "Please select at least one friend to find common times.",
        variant: "destructive",
      });
      return;
    }

    if (selectedDays.length === 0) {
      toast({
        title: "No days selected",
        description: "Please select at least one day of the week.",
        variant: "destructive",
      });
      return;
    }

    if (startTime >= endTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    onFindTimes(selectedFriends, duration, { startTime, endTime }, selectedDays);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="appointment-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Find Common Meeting Times
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Friends Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Select Friends ({selectedFriends.length}/{friends.length})
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAllFriends}
                  data-testid="select-all-friends"
                >
                  {selectedFriends.length === friends.length ? "Clear All" : "Select All"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {friends.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No friends found. Add some friends first!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(() => {
                    // Deduplicate friends by friend.id to avoid duplicate keys
                    const uniqueFriends = new Map();
                    friends.forEach((friendWithUser) => {
                      const friendKey = friendWithUser.friend.id;
                      if (!uniqueFriends.has(friendKey)) {
                        uniqueFriends.set(friendKey, {
                          ...friendWithUser,
                          // Use the actual friend's ID as the key, not the friendId from the relationship
                          friendId: friendKey
                        });
                      }
                    });
                    return Array.from(uniqueFriends.values());
                  })().map((friendWithUser) => (
                    <div
                      key={friendWithUser.friend.id}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedFriends.includes(friendWithUser.friend.id)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => handleFriendToggle(friendWithUser.friend.id)}
                      data-testid={`friend-option-${friendWithUser.friend.id}`}
                    >
                      <Checkbox
                        checked={selectedFriends.includes(friendWithUser.friend.id)}
                        onChange={() => handleFriendToggle(friendWithUser.friend.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friendWithUser.friend.avatar || undefined} />
                        <AvatarFallback>{friendWithUser.friend.fullName?.[0] || friendWithUser.friend.username[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {friendWithUser.friend.fullName || friendWithUser.friend.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {friendWithUser.friend.major}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meeting Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Meeting Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Duration */}
              <div>
                <Label htmlFor="duration" className="text-sm font-medium">Meeting Duration</Label>
                <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value) as AppointmentDuration)}>
                  <SelectTrigger className="mt-2" data-testid="duration-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentDurations.map((d) => (
                      <SelectItem key={d} value={d.toString()}>
                        {d} minutes {d === 60 ? "(1 hour)" : d === 90 ? "(1.5 hours)" : d === 120 ? "(2 hours)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Range */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Search Time Range</Label>
                <p className="text-xs text-muted-foreground">Find common available time slots within this time range</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime" className="text-xs text-muted-foreground">From</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1"
                      data-testid="start-time-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime" className="text-xs text-muted-foreground">To</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1"
                      data-testid="end-time-input"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Days Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Days of Week ({selectedDays.length}/7)
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectWorkdays} data-testid="select-workdays">
                    Weekdays
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSelectWeekend} data-testid="select-weekend">
                    Weekend
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSelectAllDays} data-testid="select-all-days">
                    {selectedDays.length === 7 ? "Clear All" : "All"}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {days.map((day) => (
                  <div
                    key={day.value}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-colors text-center",
                      selectedDays.includes(day.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleDayToggle(day.value)}
                    data-testid={`day-option-${day.value}`}
                  >
                    <span className="text-xs font-medium">{day.short}</span>
                    <span className="text-xs">{day.label.slice(0,3)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              data-testid="cancel-appointment"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFindTimes}
              disabled={isLoading || selectedFriends.length === 0 || selectedDays.length === 0}
              data-testid="find-times-button"
            >
              {isLoading ? "Finding Times..." : "Find Common Times"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}