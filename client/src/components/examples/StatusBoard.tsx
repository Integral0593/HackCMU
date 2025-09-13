import { useState } from 'react'
import StatusBoard from '../StatusBoard'
import { CurrentStatusResponse } from '@shared/schema'

export default function StatusBoardExample() {
  // todo: remove mock functionality
  const [isLoading, setIsLoading] = useState(false);
  
  const mockStatusData: CurrentStatusResponse = {
    now: new Date().toISOString(),
    in_class: [
      {
        id: "1",
        username: "Alice Chen",
        major: "Computer Science",
        current_class: "CS 151",
        manual_status: "studying"
      }
    ],
    free: [
      {
        id: "2", 
        username: "Bob Johnson",
        major: "Mathematics",
        next_class: "Math 201 @ 2:00 PM",
        manual_status: "free"
      },
      {
        id: "3",
        username: "Carol Smith", 
        major: "Business",
        manual_status: "help"
      }
    ]
  };

  const handleRefresh = () => {
    setIsLoading(true);
    console.log('Refreshing status...');
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleUserClick = (userId: string) => {
    console.log('User clicked:', userId);
  };

  return (
    <div className="p-4">
      <StatusBoard 
        statusData={mockStatusData}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onUserClick={handleUserClick}
      />
    </div>
  );
}