import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { insertScheduleSchema, InsertSchedule, Schedule } from "@shared/schema";
import { Plus, X, Clock, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleFormProps {
  schedules: Schedule[];
  onAddSchedule: (schedule: InsertSchedule) => void;
  onRemoveSchedule?: (scheduleId: string) => void;
  onUploadICS?: (schedules: Schedule[]) => void;
  userId?: string;
}

const days = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export default function ScheduleForm({ schedules, onAddSchedule, onRemoveSchedule, onUploadICS, userId }: ScheduleFormProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const form = useForm<InsertSchedule>({
    resolver: zodResolver(insertScheduleSchema),
    defaultValues: {
      courseCode: "",
      courseName: "",
      day: "monday" as const,
      startTime: "",
      endTime: "",
      location: "",
    },
  });

  const onSubmit = (data: InsertSchedule) => {
    onAddSchedule(data);
    form.reset();
    setIsFormOpen(false);
    console.log('Schedule added:', data);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    if (!file.name.endsWith('.ics')) {
      toast({
        title: "Invalid file type",
        description: "Please select a .ics calendar file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('icsFile', file);

    try {
      const response = await fetch(`/api/schedules/${userId}/upload-ics`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success!",
          description: result.message,
        });
        if (onUploadICS && result.schedules) {
          onUploadICS(result.schedules);
        }
      } else {
        toast({
          title: "Upload failed",
          description: result.error || "Failed to upload file",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while uploading the file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-base sm:text-lg">My Schedule</span>
          </div>
          <div className="flex flex-col xs:flex-row gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleUploadClick}
              disabled={isUploading || !userId}
              data-testid="upload-ics-button"
              className="w-full xs:w-auto text-xs sm:text-sm min-h-[40px] sm:min-h-[32px]"
            >
              <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              {isUploading ? "Uploading..." : "Import ICS"}
            </Button>
            <Button 
              size="sm" 
              onClick={() => setIsFormOpen(!isFormOpen)}
              data-testid="add-schedule-button"
              className="w-full xs:w-auto text-xs sm:text-sm min-h-[40px] sm:min-h-[32px]"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Add Course
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".ics"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          data-testid="file-input-ics"
        />
        
        {/* Schedule List */}
        <div className="space-y-2">
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No courses added yet. Add your first course to get started!
            </p>
          ) : (
            schedules.map((schedule) => (
              <div 
                key={schedule.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-accent/50 rounded-md gap-2 sm:gap-0"
                data-testid={`schedule-item-${schedule.id}`}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">{schedule.courseCode}</Badge>
                    <span className="font-medium text-sm">{schedule.courseName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {schedule.day.charAt(0).toUpperCase() + schedule.day.slice(1)} • {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    {schedule.location && ` • ${schedule.location}`}
                  </p>
                </div>
                {onRemoveSchedule && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveSchedule(schedule.id)}
                    data-testid={`remove-schedule-${schedule.id}`}
                    className="self-end sm:self-center min-h-[36px] min-w-[36px]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add Course Form */}
        {isFormOpen && (
          <Card>
            <CardContent className="p-3 sm:p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      control={form.control}
                      name="courseCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="CS 151" 
                              {...field} 
                              data-testid="input-course-code"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="courseName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Intro to CS" 
                              {...field}
                              data-testid="input-course-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-day">
                              <SelectValue placeholder="Select a day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {days.map((day) => (
                              <SelectItem key={day.value} value={day.value}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field}
                              data-testid="input-start-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field}
                              data-testid="input-end-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="UC Building, Room 101" 
                            {...field}
                            value={field.value || ""}
                            data-testid="input-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col xs:flex-row gap-2">
                    <Button 
                      type="submit" 
                      size="sm"
                      data-testid="submit-schedule"
                      className="w-full xs:w-auto text-xs sm:text-sm min-h-[40px] sm:min-h-[32px]"
                    >
                      Add Course
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsFormOpen(false)}
                      data-testid="cancel-schedule"
                      className="w-full xs:w-auto text-xs sm:text-sm min-h-[40px] sm:min-h-[32px]"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}