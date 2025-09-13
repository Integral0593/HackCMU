#SlotSync
online address: https://hackcmu-slotsync-app.onrender.com/

##🚀 Overview 

SlotSync is a campus study partner matching platform that connects students based on shared classes, majors and hobbies. Upload your course schedule, set your study status, and discover available study partners. It helps students keep track of their friends and coursemates and break the social barrier that commonly occur in large campuses.

##🎯 Inspiration 

With thousands of students on campus, it's surprisingly difficult to connect with peers—especially for first-years who are still building their social networks. Yet social connections are crucial: you'll inevitably encounter group projects, collaborative assignments, and study sessions where having the right study partners makes all the difference. SlotSync bridges this gap by helping students find classmates who share their courses and are available to study together right now.

##🛠 What it does

- Live status board: "📚 In Class" and "✅ Free Now," with real-time status detection
- One-tap manual status: free / studying / help / busy / tired / social
- Schedule input: Upload ICS files or manually add courses (day + time range)
- Smart matching: Same-class classmates who are currently free, ranked with explainable reasons
- Real-time chat: Instant messaging with study partners

##⚡ How we built it Tech Stack:
- Frontend: React + TypeScript, Wouter routing, shadcn/ui components, Tailwind CSS
- Backend: Node.js + Express.js, PostgreSQL + Drizzle ORM
- Real-time: WebSocket integration for live messaging
- File Processing: ICS parser with RRULE support for recurring events
- Development: Vite build system, TypeScript across the stack
- Deployment: Replit for instant online access

We built a modern, type-safe full-stack application with React frontend and Express backend. The architecture prioritizes real-time updates, intelligent matching algorithms, and seamless schedule integration. PostgreSQL provides reliable data persistence while WebSockets enable instant communication between study partners.

##🎨 Design 

Mobile-first responsive design with clean status cards, intuitive schedule upload, and clear recommendation cards showing shared classes and compatibility scores. Scotty-themed branding elements add friendly campus appeal. It has great experience across all devices and preferences.

##💪 Challenges we ran into
- ICS parsing complexity: Handling RRULE recurring events and converting weekday formats
- Real-time synchronization: Coordinating WebSocket authentication with Express sessions
- Status intelligence: Balancing automatic schedule detection with manual status overrides
- Type safety: Maintaining end-to-end TypeScript coverage across frontend and backend
- Friend request flow: Implementing two-way approval system with immediate UI feedback

##🏆 Accomplishments that we're proud of
- Seamless ICS file processing with automatic course code extraction and color coding
- Real-time status detection that intelligently combines schedule and manual input
- Sophisticated recommendation algorithm with explainable, weighted scoring
- Full-stack TypeScript implementation with shared schema validation
- Intuitive friend request system with notifications and real-time messaging
- Production-ready PostgreSQL integration with proper migrations


##🔮 What's next for SlotSync
- Enhanced matching: Location-based scoring using campus building data
- Calendar integration: Direct scheduling with Google Calendar/Outlook sync
- Smart notifications: Push alerts for friend requests and study opportunities


👥 Team Built with ❤️ within 24 hours @HackCMU