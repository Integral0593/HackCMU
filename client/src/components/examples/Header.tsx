import { useState } from 'react'
import Header from '../Header'
import { User } from '@shared/schema'

export default function HeaderExample() {
  // todo: remove mock functionality
  const [user, setUser] = useState<User | null>({
    id: "1",
    username: "Alice Chen",
    major: "Computer Science",
    avatar: undefined
  });

  return (
    <div>
      <Header 
        user={user}
        userStatus="studying"
        onLogin={() => {
          setUser({
            id: "1",
            username: "Alice Chen",
            major: "Computer Science",
            avatar: undefined
          });
          console.log('Login clicked');
        }}
        onLogout={() => {
          setUser(null);
          console.log('Logout clicked');
        }}
      />
      <div className="p-4 text-sm text-muted-foreground">
        Content area below header...
      </div>
    </div>
  );
}