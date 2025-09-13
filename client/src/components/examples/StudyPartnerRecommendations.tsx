import { useState } from 'react'
import StudyPartnerRecommendations from '../StudyPartnerRecommendations'
import { StudyPartner } from '@shared/schema'

export default function StudyPartnerRecommendationsExample() {
  // Clean state - no mock data
  const [isLoading, setIsLoading] = useState(false);
  
  const emptyRecommendations: StudyPartner[] = [];

  const handleRefresh = () => {
    setIsLoading(true);
    console.log('Refreshing recommendations...');
    setTimeout(() => setIsLoading(false), 1500);
  };

  const handleConnect = (partnerId: string) => {
    console.log('Connecting to partner:', partnerId);
  };

  return (
    <div className="max-w-md p-4">
      <StudyPartnerRecommendations 
        recommendations={emptyRecommendations}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onConnect={handleConnect}
      />
    </div>
  );
}