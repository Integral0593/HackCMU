import { useState } from 'react'
import StatusButtons from '../StatusButtons'

export default function StatusButtonsExample() {
  // todo: remove mock functionality
  const [status, setStatus] = useState<"studying" | "free" | "help" | "busy" | "tired" | "social">("free");

  return (
    <div className="p-4 max-w-md">
      <h3 className="font-medium mb-4">Current Status: {status}</h3>
      <StatusButtons 
        currentStatus={status}
        onStatusChange={(newStatus) => {
          setStatus(newStatus);
          console.log('Status changed to:', newStatus);
        }}
      />
    </div>
  );
}