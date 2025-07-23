# Therapprove Enhancements

This repository contains proof-of-concept enhancements for the Therapprove application, focusing on improving location-based filtering and availability scheduling features.

## Features

### 1. Location-Based Filtering

The location enhancement provides:

- **Zip Code Search**: 5-digit validation with real-time patient filtering and distance calculation
- **Radius Filtering**: Options for 10, 25, and 50 mile radius with visual distance badges
- **Quick Location Filters**: One-click filtering for Indianapolis, Louisville, and Lexington
- **Smart Insights Banner**: Shows patient counts within selected distances
- **Enhanced Patient Table**: Includes distance column showing exact miles
- **Map View Toggle**: Visual patient distribution with interactive pins

### 2. Availability Selection

The availability enhancement provides:

- **Date-Aware Scheduling**: Week numbers and specific calendar dates for each day
- **Week Navigation**: Navigate between weeks to schedule future availability
- **15-Minute Increment Selection**: Visual grid interface for selecting time slots
- **Copy/Paste Functionality**: Copy schedule from one day and paste to another
- **Calendar Preview**: Google Calendar-style view showing all selected time slots
- **Local Storage**: Saves selections between sessions
- **AI Suggestions**: Template-based availability patterns for quick setup
- **Export Options**: Export availability to CSV, ICS, Excel, Google Calendar, or Outlook

## Files

- `index.html` - Main demo page for location filtering
- `script.js` - JavaScript for location filtering functionality
- `styles.css` - CSS styles for location filtering
- `availability.html` - Demo page for availability selection
- `availability.js` - JavaScript for availability selection functionality
- `availability-styles.css` - CSS styles for availability selection
- `embed-code.html` - Code for embedding the demo in other platforms
- `presentation.md` - Presentation notes for the location enhancement proposal

## Getting Started

1. Open `index.html` to view the location filtering demo
2. Open `availability.html` to view the availability selection demo

## Recent Improvements to Availability Feature

### Date-Aware Scheduling
- Added week number and date display (e.g., "Week 30, Jul 23 – Jul 29")
- Implemented week navigation with "Prev Week" and "Next Week" buttons
- Day buttons now show both weekday name and specific date
- Highlighted current date for better context

### Enhanced Calendar Preview
- Implemented a Google Calendar-style weekly view
- Each hour divided into 4 quarter-hour slots
- Tooltips show exact timestamp on hover
- Highlighted the current day being edited

### Export Functionality
- **File Exports**: CSV, iCalendar (.ics), and Excel formats
- **Calendar Integration**: Direct export to Google Calendar and Outlook
- Export dropdown menu with intuitive icons
- Detailed instructions for importing to external calendars

### Other Improvements
- Data now stored by specific date (year-week-day-time)
- Improved accessibility with keyboard navigation
- Enhanced mobile responsiveness
- Visual feedback for user actions

## Future Enhancements

- Two-way sync with external calendars
- Recurring availability patterns (e.g., every Monday)
- Conflict detection between provider and patient availability
- Mobile app implementation
- Multi-provider scheduling view

## Notes from Team Discussion

- Consider incorporating a calendar-based approach for provider availability
- Explore AI to enhance availability matching and scheduling features
- Keep the interface simple and mobile-friendly
- Include weekend availability options for future expansion to other healthcare sectors
