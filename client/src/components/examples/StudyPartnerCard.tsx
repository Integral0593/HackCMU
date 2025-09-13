import StudyPartnerCard from '../StudyPartnerCard'
import { StudyPartner } from '@shared/schema'

export default function StudyPartnerCardExample() {
  // todo: remove mock functionality
  const mockPartner: StudyPartner = {
    id: "2",
    username: "Bob Johnson",
    major: "Mathematics",
    avatar: undefined,
    score: 85,
    shared_classes: ["CS 151", "Math 201"],
    current_class: undefined,
    next_class: "CS 151 @ 2:00 PM",
    reason: "Shares 2 classes with you; Both interested in studying"
  };

  return (
    <div className="max-w-sm p-4">
      <StudyPartnerCard 
        partner={mockPartner}
        onConnect={(id) => console.log('Connect clicked for partner:', id)}
      />
    </div>
  );
}