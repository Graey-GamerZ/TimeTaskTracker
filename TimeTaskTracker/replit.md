# Task Management Application

## Overview

This is a full-stack task management application built with React frontend and Express backend. The application allows users to create, manage, and track tasks with features like priority levels, categories, scheduled dates, and browser notifications. Data is persisted in a PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with custom styling
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Management**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **API Design**: RESTful API with JSON responses
- **Development**: Hot module replacement with Vite integration

## Key Components

### Database Schema
- **Tasks Table**: Stores task information with fields for title, scheduled date, priority, category, completion status, and timestamps
- **Priority Levels**: Low, Medium, High
- **Categories**: Work, Personal, Shopping, Health
- **Validation**: Zod schemas for type-safe data validation

### Frontend Features
- **Task Creation**: Form-based task creation with date/time scheduling
- **Task Management**: View, edit, delete, and complete tasks
- **Filtering**: Filter tasks by status (all, pending, completed)
- **Notifications**: Browser notifications for scheduled tasks
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Toast Notifications**: User feedback for actions

### Backend API Endpoints
- `GET /api/tasks` - Retrieve all tasks
- `POST /api/tasks` - Create a new task
- `PATCH /api/tasks/:id` - Update an existing task
- `DELETE /api/tasks/:id` - Delete a task

### Storage Strategy
- **Current**: PostgreSQL database with Drizzle ORM (DatabaseStorage class)
- **Database**: Neon PostgreSQL with connection pooling
- **Migrations**: Drizzle migrations for database schema changes

## Data Flow

1. **Task Creation**: User fills form → React Hook Form validates → API request to Express → Database insertion → UI update
2. **Task Retrieval**: Component mounts → React Query fetches from API → Express queries database → Data displayed in UI
3. **Task Updates**: User action → Optimistic UI update → API request → Database update → UI confirmation
4. **Notifications**: Task scheduling → Browser notification permission → Scheduled notification triggers

## External Dependencies

### Frontend Dependencies
- **UI Library**: Radix UI for accessible components
- **Icons**: Lucide React for consistent iconography
- **Date Handling**: date-fns for date formatting and manipulation
- **HTTP Client**: Fetch API with React Query wrapper
- **Form Validation**: React Hook Form + Zod for type-safe forms

### Backend Dependencies
- **Database**: Neon Database (serverless PostgreSQL)
- **ORM**: Drizzle ORM for type-safe database operations
- **Session Store**: PostgreSQL session storage
- **Development Tools**: tsx for TypeScript execution, esbuild for production builds

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: esbuild bundles Express server to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment setting (development/production)
- **Session Configuration**: PostgreSQL-backed sessions for scalability

### Production Considerations
- Static file serving from Express in production
- Database migrations managed through Drizzle
- Error handling with proper HTTP status codes
- CORS and security headers configuration needed for production deployment

### Development Workflow
- Hot module replacement in development
- Automatic TypeScript compilation
- Database schema synchronization
- Integrated error overlay for debugging

## Recent Changes

### Dark Mode Implementation (January 12, 2025)
- Added comprehensive dark mode support with theme toggle switch
- Created React Context-based theme provider with localStorage persistence
- Added dark mode CSS variables and styling throughout the application
- Implemented automatic system preference detection
- Added theme toggle button in header with moon/sun icons
- Updated all components to support both light and dark themes
- Enhanced task cards, banners, and UI elements with proper dark mode styling

### PWA and Desktop Notifications (January 12, 2025)
- Added Progressive Web App (PWA) functionality for desktop installation
- Created PWA manifest with app icons and metadata
- Implemented service worker for offline functionality
- Added desktop notification system with permission handling
- Fixed notification permission caching issues with "Test Now" button
- App can now be installed on desktop and works offline
- Added visual feedback and debugging for notification system

### Database Integration (January 12, 2025)
- Added PostgreSQL database with Neon provider
- Replaced in-memory storage with DatabaseStorage class
- Updated storage interface to use Drizzle ORM
- Created database schema with `npm run db:push`
- All task data now persists across application restarts