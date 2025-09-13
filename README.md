# SlotSync
**Live demo:** https://hackcmu-slotsync-app.onrender.com/

## 🚀 Overview
SlotSync is a campus study-partner matching platform that connects students by shared classes, majors, and hobbies. Upload your course schedule, set your study status, and discover available partners. It helps students keep track of friends and coursemates and lowers the social barrier that’s common on large campuses.

## 🎯 Inspiration
On a campus of thousands, it’s surprisingly hard to find peers who are free when you are—especially for first-years still building their networks. Yet group projects, collaborative assignments, and study sessions are everywhere. SlotSync bridges this gap by matching classmates who share your courses and are available to study **right now**.

## 🛠 What it does
- **Live status board:** “📚 In Class” / “✅ Free Now,” with real-time updates  
- **One-tap status:** free / studying / help / busy / tired / social  
- **Schedule input:** upload ICS files or add courses manually (day + time range)  
- **Smart matching:** same-class classmates who are currently free, ranked with explainable reasons  
- **Real-time chat:** instant messaging with study partners

## ⚡ How we built it (Tech stack)
- **Frontend:** React + TypeScript, Wouter routing, shadcn/ui, Tailwind CSS  
- **Backend:** Node.js + Express, PostgreSQL (Neon) + Drizzle ORM  
- **Realtime:** WebSocket for live messaging  
- **File processing:** ICS parser with RRULE support for recurring events  
- **Dev/build:** Vite, TypeScript across the stack  
- **Deployment:** Render (app) + Neon PostgreSQL

We built a modern, type-safe full-stack app with a React frontend and an Express backend. The architecture prioritizes real-time updates, explainable matching, and seamless schedule integration. PostgreSQL provides reliable persistence while WebSockets power instant communication.

## 🎨 Design
Mobile-first responsive UI with clean status cards, intuitive schedule upload, and clear recommendation cards showing shared classes and compatibility scores. Scotty-themed branding adds friendly campus appeal. Smooth across devices and preferences.

## 💪 Challenges
- ICS parsing: handling RRULE recurrence and weekday formats  
- Realtime sync: coordinating WebSocket auth with Express sessions  
- Status intelligence: balancing automatic schedule detection with manual overrides  
- Type safety: end-to-end TypeScript  
- Friend flow: two-way approval with instant UI feedback

## 🏆 Accomplishments
- Seamless ICS processing with course code extraction and color coding  
- Real-time status detection combining schedule + manual input  
- Explainable, weighted recommendation algorithm  
- Full-stack TypeScript with shared schema validation  
- Intuitive friend requests with notifications and live messaging  
- Production-ready Postgres integration with proper migrations

## 🔮 What’s next
- Enhanced matching: location-aware scoring with campus buildings  
- Calendar integration: Google Calendar / Outlook sync  
- Smart notifications: push alerts for requests and study opportunities

👥 Team — built with ❤️ in 24 hours @ HackCMU
