import { useState } from 'react'
import StatusBoard from '../StatusBoard'
import { CurrentStatusResponse } from '@shared/schema'

export default function StatusBoardExample() {
  // Clean state - no mock data
  const [isLoading, setIsLoading] = useState(false);
  
  const emptyStatusData: CurrentStatusResponse = {
    now: new Date().toISOString(),
    in_class: [],
    free: []
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
        statusData={emptyStatusData}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onUserClick={handleUserClick}
      />
    </div>
  );
}