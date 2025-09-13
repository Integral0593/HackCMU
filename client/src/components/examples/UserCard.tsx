import UserCard from '../UserCard'

export default function UserCardExample() {
  // Clean state - no mock data
  const placeholderUser = {
    id: "placeholder",
    username: "Sample User",
    major: "Sample Major",
    avatar: null
  };

  return (
    <div className="max-w-sm p-4">
      <UserCard 
        user={placeholderUser}
        status="studying"
        currentClass="Sample Class"
        nextClass="Next Class"
        onClick={() => console.log('User card clicked')}
      />
    </div>
  );
}