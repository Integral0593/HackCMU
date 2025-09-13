import UserCard from '../UserCard'

export default function UserCardExample() {
  // todo: remove mock functionality
  const mockUser = {
    id: "1",
    username: "Alice Chen",
    major: "Computer Science",
    avatar: undefined
  };

  return (
    <div className="max-w-sm p-4">
      <UserCard 
        user={mockUser}
        status="studying"
        currentClass="CS 151"
        nextClass="Math 201 @ 2:00 PM"
        onClick={() => console.log('User card clicked')}
      />
    </div>
  );
}