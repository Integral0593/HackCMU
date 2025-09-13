import { useState } from 'react'
import StudyPartnerRecommendations from '../StudyPartnerRecommendations'
import { StudyPartner } from '@shared/schema'

export default function StudyPartnerRecommendationsExample() {
  // todo: remove mock functionality
  const [isLoading, setIsLoading] = useState(false);
  
  const mockRecommendations: StudyPartner[] = [
    {
      id: "2",
      username: "Bob Johnson",
      major: "Mathematics", 
      avatar: undefined,
      score: 85,
      shared_classes: ["CS 151", "Math 201"],
      current_class: undefined,
      next_class: "CS 151 @ 2:00 PM",
      reason: "Shares 2 classes with you; Both interested in studying"
    },
    {
      id: "3",
      username: "Carol Smith",
      major: "Business",
      avatar: undefined,
      score: 72,
      shared_classes: ["Math 201"],
      current_class: undefined,
      next_class: undefined,
      reason: "Shares 1 class with you; Available to help"
    }
  ];

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
        recommendations={mockRecommendations}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onConnect={handleConnect}
      />
    </div>
  );
}