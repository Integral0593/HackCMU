import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { insertScheduleSchema, InsertSchedule, Schedule } from "@shared/schema";
import { Plus, X, Clock } from "lucide-react";

interface ScheduleFormProps {
  schedules: Schedule[];
  onAddSchedule: (schedule: InsertSchedule) => void;
  onRemoveSchedule?: (scheduleId: string) => void;
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

export default function ScheduleForm({ schedules, onAddSchedule, onRemoveSchedule }: ScheduleFormProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            My Schedule
          </div>
          <Button 
            size="sm" 
            onClick={() => setIsFormOpen(!isFormOpen)}
            data-testid="add-schedule-button"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Course
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
                className="flex items-center justify-between p-3 bg-accent/50 rounded-md"
                data-testid={`schedule-item-${schedule.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{schedule.courseCode}</Badge>
                    <span className="font-medium text-sm">{schedule.courseName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
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
            <CardContent className="p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4">
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
                            data-testid="input-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      size="sm"
                      data-testid="submit-schedule"
                    >
                      Add Course
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsFormOpen(false)}
                      data-testid="cancel-schedule"
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