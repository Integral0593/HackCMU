# Design Guidelines for Campus Study Partner Matching H5 Website

## Design Approach
**Reference-Based Approach**: Drawing inspiration from modern productivity and social apps like Linear, Notion, and Discord for their clean interfaces and real-time collaboration features.

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 250 100% 65% (vibrant blue)
- Secondary: 220 15% 25% (dark gray)
- Background: 0 0% 98% (off-white)
- Surface: 0 0% 100% (white)

**Dark Mode:**
- Primary: 250 80% 70% (softer blue)
- Secondary: 220 20% 75% (light gray)
- Background: 220 25% 8% (dark blue-gray)
- Surface: 220 20% 12% (elevated dark)

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Headers**: 600-700 weight
- **Body**: 400-500 weight
- **Accent**: 500 weight for buttons and highlights

### Layout System
**Spacing Units**: Tailwind 2, 4, 6, 8, 12, 16
- Consistent 4-unit (1rem) rhythm
- 2-unit for tight spacing
- 8-16 for section separation

### Component Library

**Navigation**
- Fixed top navigation with app logo and user avatar
- Tab-based navigation for main sections
- Breadcrumb for deeper pages

**Status Components**
- Circular status indicators with colors:
  - Studying: 120 70% 50% (green)
  - Free: 200 90% 60% (light blue)
  - Help: 30 100% 60% (orange)
  - Busy: 0 80% 60% (red)
  - Tired: 280 60% 65% (purple)
  - Social: 320 70% 55% (pink)

**Cards & Recommendations**
- Clean white/dark cards with subtle shadows
- Profile cards showing: avatar, name, major, common courses
- Match reason badges with soft background colors

**Forms**
- Modern input fields with floating labels
- Schedule grid with time slots and drag-drop capability
- Toggle switches for status updates

**Real-time Elements**
- Subtle pulse animations for live status
- Loading skeletons during 30-second polling
- Toast notifications for status changes

### Mobile-First Design
- Single-column layout on mobile
- Bottom tab navigation
- Swipeable cards for recommendations
- Large touch targets (44px minimum)

### Visual Hierarchy
- Bold typography for names and course titles
- Subtle text for metadata (time, location)
- Color-coded status throughout interface
- Generous whitespace for readability

### Interactive Elements
- Smooth transitions (200-300ms)
- Hover states with subtle color shifts
- Active states with slight scale transforms
- Disabled states with reduced opacity

This design creates a modern, campus-friendly interface that prioritizes clarity and real-time collaboration while maintaining the energy of student life through thoughtful color choices and clean typography.