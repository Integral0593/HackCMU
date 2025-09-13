import StudyPartnerCard from '../StudyPartnerCard'
import { StudyPartner } from '@shared/schema'

export default function StudyPartnerCardExample() {
  // Clean state - no mock data
  const placeholderPartner: StudyPartner = {
    id: "placeholder",
    username: "Sample Partner",
    major: "Sample Major",
    avatar: null,
    score: 0,
    shared_classes: [],
    current_class: undefined,
    next_class: undefined,
    reason: "No matching criteria yet"
  };

  return (
    <div className="max-w-sm p-4">
      <StudyPartnerCard 
        partner={placeholderPartner}
        onConnect={(id) => console.log('Connect clicked for partner:', id)}
      />
    </div>
  );
}