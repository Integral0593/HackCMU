import { useState } from 'react'
import ScheduleForm from '../ScheduleForm'
import { Schedule, InsertSchedule } from '@shared/schema'

export default function ScheduleFormExample() {
  // Clean state - no mock data
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const handleAddSchedule = (newSchedule: InsertSchedule) => {
    const schedule: Schedule = {
      ...newSchedule,
      id: Math.random().toString(),
      userId: "placeholder-user",
      location: newSchedule.location ?? null
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