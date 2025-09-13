import { useState } from 'react'
import Header from '../Header'
import { User } from '@shared/schema'

export default function HeaderExample() {
  // Clean state - no mock data
  const [user, setUser] = useState<User | null>(null);

  return (
    <div>
      <Header 
        userStatus="studying"
      />
      <div className="p-4 text-sm text-muted-foreground">
        Content area below header...
      </div>
    </div>
  );
}