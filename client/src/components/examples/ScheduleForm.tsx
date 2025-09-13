import { useState } from 'react'
import ScheduleForm from '../ScheduleForm'
import { Schedule, InsertSchedule } from '@shared/schema'

export default function ScheduleFormExample() {
  // todo: remove mock functionality
  const [schedules, setSchedules] = useState<Schedule[]>([
    {
      id: "1",
      userId: "user1",
      courseCode: "CS 151",
      courseName: "Introduction to Computer Science",
      day: "monday",
      startTime: "10:30",
      endTime: "11:50",
      location: "UC Building"
    }
  ]);

  const handleAddSchedule = (newSchedule: InsertSchedule) => {
    const schedule: Schedule = {
      ...newSchedule,
      id: Math.random().toString(),
      userId: "user1"
    };
    setSchedules(prev => [...prev, schedule]);
  };

  const handleRemoveSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
  };

  return (
    <div className="max-w-md p-4">
      <ScheduleForm 
        schedules={schedules}
        onAddSchedule={handleAddSchedule}
        onRemoveSchedule={handleRemoveSchedule}
      />
    </div>
  );
}