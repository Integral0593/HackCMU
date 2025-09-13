# Campus Study Partner Matching System

## Overview

A campus study partner matching platform that connects students based on shared classes and real-time status. The application allows students to upload their course schedules, set their current study status, and find suitable study partners through intelligent recommendations. Built with a hybrid architecture featuring Flask backend services and React frontend components, the system enables real-time collaboration and schedule-based matching.

## Recent Changes

### Two-Way Friend Approval System (September 2025)
- **Enhanced Friend Request Workflow**: Implemented two-way friend approval system replacing immediate friend confirmation
- **Pending Request Management**: Friend requests now create pending status requiring recipient acceptance
- **Notifications Page**: Added comprehensive notifications page at `/notifications` route displaying pending friend requests
- **Interactive Request Actions**: Users can accept or reject friend requests with immediate UI feedback
- **Notification Badge**: Header now includes Bell icon with red badge showing count of pending requests
- **API Security**: Added authorization checks ensuring only recipients can accept/reject their own friend requests
- **Database Schema Updates**: Modified friend status to default to "pending" instead of "confirmed"

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React-based SPA**: Built with TypeScript, React Router (Wouter), and TanStack Query for state management
- **Component Library**: Radix UI primitives with shadcn/ui design system for consistent UI components
- **Styling**: Tailwind CSS with custom design tokens and theme support (light/dark mode)
- **Build System**: Vite for fast development and optimized production builds

### Backend Architecture
- **Hybrid Service Layer**: Flask-based Python services for core business logic alongside Express.js/TypeScript API routes
- **Service-Oriented Design**: Separate services for schedule management, status tracking, recommendations, and ICS file parsing
- **Data Models**: Strongly-typed models using Pydantic-style dataclasses and Zod schemas for validation
- **Session Management**: Flask sessions for user authentication and state persistence

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Normalized tables for users, schedules, and user status with proper foreign key relationships
- **In-Memory Storage**: Fallback memory storage implementation for development and testing

### Authentication and Authorization
- **Session-Based Auth**: Flask session management with secure session keys
- **User Management**: Simple username/major-based registration without complex authentication flows
- **Authorization**: User-scoped data access with service-layer permission checks

### Status Management System
- **Real-Time Status**: Six status types (studying, free, help, busy, tired, social) with timestamp tracking
- **Schedule Integration**: Automatic status inference based on current class schedules
- **Manual Override**: User-controlled status updates that override schedule-based status

### Recommendation Engine
- **Class-Based Matching**: Algorithm that finds study partners based on shared courses
- **Status Compatibility**: Filters recommendations based on complementary status types (e.g., "help" with "studying")
- **Scoring System**: Weighted scoring considering shared classes, status compatibility, and availability

### Schedule Management
- **ICS Import**: Parser for standard calendar files from Google Calendar, Outlook, and other calendar applications
- **Manual Entry**: Form-based schedule creation with course codes, names, times, and locations
- **Time Conflict Detection**: Validation to prevent overlapping schedule entries

## External Dependencies

### UI and Component Libraries
- **Radix UI**: Comprehensive set of accessible UI primitives for complex components
- **shadcn/ui**: Pre-built component library built on Radix UI with consistent design patterns
- **Lucide React**: Icon library for consistent iconography across the application

### Development and Build Tools
- **Vite**: Fast build tool with hot module replacement for development
- **TypeScript**: Type safety across both frontend and backend codebases
- **Tailwind CSS**: Utility-first CSS framework with custom design system integration

### Database and ORM
- **Neon Database**: Serverless PostgreSQL provider for scalable data storage
- **Drizzle ORM**: Type-safe database toolkit with schema generation and migration support
- **connect-pg-simple**: PostgreSQL session store for Flask session management

### Form and Validation
- **React Hook Form**: Performant form library with built-in validation
- **Zod**: Schema validation library used across frontend and backend for type safety
- **@hookform/resolvers**: Integration between React Hook Form and Zod validation

### State Management and Data Fetching
- **TanStack Query**: Powerful data synchronization library for server state management
- **React Context**: Local state management for user preferences and theme settings

### Calendar and File Processing
- **ICS Parser**: Custom service for processing calendar file uploads and extracting schedule data
- **File Upload**: Secure file handling with size limits and type validation

### Styling and Theming
- **CSS Variables**: Dynamic theming system supporting light and dark modes
- **Class Variance Authority**: Utility for creating consistent component variants
- **Tailwind Merge**: Intelligent CSS class merging for component composition