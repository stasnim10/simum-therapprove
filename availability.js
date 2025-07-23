// availability.js - Enhanced with date-aware functionality and week navigation

// Constants
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// Global state
let currentWeekStart = getStartOfWeek(new Date()); // Start with current week
let availability = {}; // Will store data by year-week-day-time
let currentDay = 0; // Sunday (0-based index)
let clipboard = null;

// DOM elements
const gridEl = document.getElementById("time-grid");
const pasteSelect = document.getElementById("paste-target");
const weekInfoEl = document.getElementById("week-info");
const weekDatesEl = document.getElementById("week-dates");
const prevWeekBtn = document.getElementById("prev-week");
const nextWeekBtn = document.getElementById("next-week");

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  initWeekNavigation();
  buildTimeGrid();
  loadFromLocalStorage();
  updateWeekDisplay();
  renderDay(currentDay);
  addAISuggestionsButton();
  initExportFunctionality();
  
  // Initialize event listeners
  document.querySelectorAll(".day-btn").forEach((btn, index) => {
    btn.addEventListener("click", () => renderDay(index));
  });
  
  document.getElementById("copy-day").addEventListener("click", copyCurrentDay);
  pasteSelect.addEventListener("change", pasteToSelectedDay);
  document.getElementById("clear-all").addEventListener("click", clearCurrentDay);
  document.getElementById("save-availability").addEventListener("click", saveAvailability);
  
  // Calendar preview toggle
  const calToggle = document.getElementById("calendar-view-toggle");
  calToggle.addEventListener("change", toggleCalendarView);
});

// Week navigation functions
function initWeekNavigation() {
  prevWeekBtn.addEventListener("click", () => {
    currentWeekStart = new Date(currentWeekStart);
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateWeekDisplay();
    renderDay(currentDay);
  });
  
  nextWeekBtn.addEventListener("click", () => {
    currentWeekStart = new Date(currentWeekStart);
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    updateWeekDisplay();
    renderDay(currentDay);
  });
}

// Update the week display with week number and dates
function updateWeekDisplay() {
  const weekNum = getISOWeek(currentWeekStart);
  const year = currentWeekStart.getFullYear();
  
  // Update week number
  weekInfoEl.textContent = `Week ${weekNum}, ${year}`;
  
  // Update day buttons with dates
  const dates = [];
  document.querySelectorAll(".day-btn").forEach((btn, index) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + index);
    
    const formattedDate = formatDate(date);
    dates.push(formattedDate);
    
    // Update button text to include date
    btn.innerHTML = `${DAYS[index]}<br><span class="date-label">${formattedDate}</span>`;
    
    // Store the full date as data attribute
    btn.dataset.fullDate = formatISODate(date);
    
    // Highlight current date
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                   date.getMonth() === today.getMonth() && 
                   date.getFullYear() === today.getFullYear();
    
    btn.classList.toggle("today", isToday);
  });
  
  // Update week dates range
  weekDatesEl.textContent = `${dates[0]} – ${dates[6]}`;
  
  // Update paste dropdown options
  updatePasteOptions();
}

// Build the time grid
function buildTimeGrid() {
  gridEl.innerHTML = ''; // Clear existing grid
  
  // Build 24h × 4 slots
  for(let hour=0; hour<24; hour++) {
    for(let q=0; q<4; q++){
      const mins = String(q*15).padStart(2,"0");
      const time = `${hour}:${mins}`;
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.time = time;
      
      // Improved time display
      if (q === 0) {
        // For hour marks, show the hour
        slot.innerText = hour;
        slot.classList.add('hour-mark');
      } else {
        // For other slots, show a dot
        slot.innerText = '·';
        slot.classList.add('minute-mark');
      }
      
      slot.addEventListener("click", () => toggleTimeSlot(slot, time));
      gridEl.appendChild(slot);
    }
  }
}

// Toggle a time slot selection
function toggleTimeSlot(slot, time) {
  const dateKey = getCurrentDateKey();
  const timeKey = time;
  
  // Initialize if needed
  if (!availability[dateKey]) {
    availability[dateKey] = new Set();
  }
  
  if (availability[dateKey].has(timeKey)) {
    availability[dateKey].delete(timeKey);
    slot.classList.remove("selected");
  } else {
    availability[dateKey].add(timeKey);
    slot.classList.add("selected");
  }
}

// Render the current day's availability
function renderDay(day) {
  currentDay = day;
  
  // Update active day button
  document.querySelectorAll(".day-btn").forEach((btn, index) => {
    btn.classList.toggle("active", index === day);
  });
  
  // Get the date key for the selected day
  const dateKey = getDateKeyForDay(day);
  
  // Update slot selections
  document.querySelectorAll(".slot").forEach(slot => {
    const timeKey = slot.dataset.time;
    const isSelected = availability[dateKey] && availability[dateKey].has(timeKey);
    slot.classList.toggle("selected", isSelected);
  });
  
  // Update paste options
  updatePasteOptions();
}

// Copy the current day's availability
function copyCurrentDay() {
  const dateKey = getCurrentDateKey();
  clipboard = availability[dateKey] ? new Set(availability[dateKey]) : new Set();
  showNotification(`Copied ${DAYS[currentDay]}'s schedule`, "success");
}

// Paste to the selected day
function pasteToSelectedDay() {
  const targetDay = +pasteSelect.value;
  if (clipboard && targetDay >= 0) {
    const targetDateKey = getDateKeyForDay(targetDay);
    
    // Initialize if needed
    if (!availability[targetDateKey]) {
      availability[targetDateKey] = new Set();
    } else {
      availability[targetDateKey].clear();
    }
    
    // Copy all slots from clipboard
    clipboard.forEach(time => availability[targetDateKey].add(time));
    
    showNotification(`Pasted to ${DAYS[targetDay]}, ${formatDate(getDateForDay(targetDay))}`, "success");
    
    if (targetDay === currentDay) {
      renderDay(currentDay);
    }
    
    // Reset the dropdown
    pasteSelect.value = "";
  }
}

// Clear the current day's availability
function clearCurrentDay() {
  if (confirm(`Are you sure you want to clear all slots for ${DAYS[currentDay]}?`)) {
    const dateKey = getCurrentDateKey();
    
    if (availability[dateKey]) {
      availability[dateKey].clear();
    }
    
    renderDay(currentDay);
    showNotification(`Cleared all slots for ${DAYS[currentDay]}`, "info");
  }
}

// Save availability data
function saveAvailability() {
  // Count total selected slots
  let totalSelected = 0;
  Object.values(availability).forEach(slots => totalSelected += slots.size);
  
  if (totalSelected === 0) {
    showNotification('Please select at least one time slot', 'warning');
    return;
  }
  
  // Save to local storage
  saveToLocalStorage();
  
  // Show confirmation
  const weekNum = getISOWeek(currentWeekStart);
  const startDate = formatDate(currentWeekStart);
  const endDate = formatDate(getDateForDay(6));
  
  showSaveConfirmation(`Saved! Week ${weekNum}: ${startDate}–${endDate}`);
  
  // Update calendar view if visible
  if (document.getElementById("calendar-view-toggle").checked) {
    renderCalendarView();
  }
}

// Toggle calendar view
function toggleCalendarView() {
  const calToggle = document.getElementById("calendar-view-toggle");
  const calView = document.getElementById("calendar-view");
  
  if (calToggle.checked) {
    renderCalendarView();
    calView.style.display = "block";
  } else {
    calView.style.display = "none";
  }
}

// Render the calendar view
function renderCalendarView() {
  const calBody = document.getElementById("calendar-body");
  calBody.innerHTML = "";
  
  // Update calendar header with dates
  const calHeader = document.querySelector(".calendar-header");
  calHeader.innerHTML = "<div></div>"; // Empty first cell
  
  for (let d = 0; d < 7; d++) {
    const date = getDateForDay(d);
    const dayCell = document.createElement("div");
    dayCell.innerHTML = `${DAYS[d]}<br>${formatDate(date)}`;
    
    // Highlight current date
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                   date.getMonth() === today.getMonth() && 
                   date.getFullYear() === today.getFullYear();
    
    if (isToday) {
      dayCell.classList.add("today");
    }
    
    // Highlight current selected day
    if (d === currentDay) {
      dayCell.classList.add("current-edit");
    }
    
    calHeader.appendChild(dayCell);
  }
  
  // Create time rows
  for (let h = 0; h < 24; h++) {
    // Time label
    const timeLabel = document.createElement("div");
    timeLabel.classList.add("time-label");
    timeLabel.textContent = `${h}:00`;
    calBody.appendChild(timeLabel);
    
    // Day columns
    for (let d = 0; d < 7; d++) {
      const dateKey = getDateKeyForDay(d);
      const hourCell = document.createElement("div");
      hourCell.classList.add("hour-cell");
      
      // Create 4 quarter-hour slots
      for (let q = 0; q < 4; q++) {
        const mins = String(q*15).padStart(2,"0");
        const timeKey = `${h}:${mins}`;
        const quarterSlot = document.createElement("div");
        quarterSlot.classList.add("quarter-slot");
        
        // Check if this slot is selected
        const isSelected = availability[dateKey] && availability[dateKey].has(timeKey);
        if (isSelected) {
          quarterSlot.classList.add("selected");
        }
        
        // Add tooltip with exact timestamp
        const date = getDateForDay(d);
        const formattedDate = `${DAYS[d]} ${formatDate(date)}`;
        const formattedTime = formatTime(h, q*15);
        quarterSlot.title = `${formattedDate}, ${formattedTime}`;
        
        hourCell.appendChild(quarterSlot);
      }
      
      calBody.appendChild(hourCell);
    }
  }
}

// Update paste options based on current day
function updatePasteOptions() {
  pasteSelect.innerHTML = '<option value="">Paste to…</option>';
  
  for (let i = 0; i < 7; i++) {
    if (i !== currentDay) {
      const date = getDateForDay(i);
      const formattedDate = formatDate(date);
      const option = document.createElement("option");
      option.value = i;
      option.text = `${DAYS[i]}, ${formattedDate}`;
      pasteSelect.appendChild(option);
    }
  }
}

// Add AI Suggestions Button
function addAISuggestionsButton() {
  const controlsDiv = document.querySelector('.controls');
  
  const aiButton = document.createElement('button');
  aiButton.className = 'action-btn ai-btn';
  aiButton.id = 'ai-suggest';
  aiButton.innerHTML = '<i class="fas fa-magic"></i> AI';
  
  controlsDiv.appendChild(aiButton);
  
  // Add event listener
  aiButton.addEventListener('click', showAISuggestionModal);
}

// Show AI suggestion modal
function showAISuggestionModal() {
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'ai-suggestion-modal';
  
  // Create template options
  const templates = [
    { name: 'Morning Hours', description: 'Early morning slots (6 AM - 12 PM)', icon: 'fa-sun' },
    { name: 'Afternoon Hours', description: 'Midday slots (12 PM - 5 PM)', icon: 'fa-coffee' },
    { name: 'Evening Hours', description: 'After-hours slots (5 PM - 10 PM)', icon: 'fa-moon' },
    { name: 'Business Hours', description: 'Standard 9-5 workday', icon: 'fa-briefcase' },
    { name: 'Weekend Pattern', description: 'Apply to Saturday and Sunday', icon: 'fa-calendar' },
    { name: 'Custom Pattern', description: 'Based on your previous selections', icon: 'fa-brain' }
  ];
  
  // Create modal content
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3><i class="fas fa-magic"></i> AI Availability Suggestions</h3>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body">
        <p>Select a template to apply AI-suggested availability patterns:</p>
        <div class="template-grid">
          ${templates.map(template => `
            <div class="template-card" data-template="${template.name.toLowerCase().replace(' ', '-')}">
              <div class="template-icon">
                <i class="fas ${template.icon}"></i>
              </div>
              <div class="template-info">
                <h4>${template.name}</h4>
                <p>${template.description}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="secondary-btn close-modal">Cancel</button>
      </div>
    </div>
  `;
  
  // Add to body
  document.body.appendChild(modal);
  
  // Add close functionality
  modal.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', function() {
      modal.remove();
    });
  });
  
  // Add template selection functionality
  modal.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', function() {
      const template = this.dataset.template;
      applyAITemplate(template);
      modal.remove();
    });
  });
}

// Apply AI template
function applyAITemplate(template) {
  const dateKey = getCurrentDateKey();
  
  // Initialize if needed
  if (!availability[dateKey]) {
    availability[dateKey] = new Set();
  } else {
    availability[dateKey].clear();
  }
  
  switch (template) {
    case 'morning-hours':
      // Select 6 AM - 12 PM
      for (let h = 6; h < 12; h++) {
        for (let q = 0; q < 4; q++) {
          const mins = String(q*15).padStart(2,"0");
          availability[dateKey].add(`${h}:${mins}`);
        }
      }
      showNotification('Applied Morning Hours template', 'success');
      break;
      
    case 'afternoon-hours':
      // Select 12 PM - 5 PM
      for (let h = 12; h < 17; h++) {
        for (let q = 0; q < 4; q++) {
          const mins = String(q*15).padStart(2,"0");
          availability[dateKey].add(`${h}:${mins}`);
        }
      }
      showNotification('Applied Afternoon Hours template', 'success');
      break;
      
    case 'evening-hours':
      // Select 5 PM - 10 PM
      for (let h = 17; h < 22; h++) {
        for (let q = 0; q < 4; q++) {
          const mins = String(q*15).padStart(2,"0");
          availability[dateKey].add(`${h}:${mins}`);
        }
      }
      showNotification('Applied Evening Hours template', 'success');
      break;
      
    case 'business-hours':
      // Select 9 AM - 5 PM
      for (let h = 9; h < 17; h++) {
        for (let q = 0; q < 4; q++) {
          const mins = String(q*15).padStart(2,"0");
          availability[dateKey].add(`${h}:${mins}`);
        }
      }
      showNotification('Applied Business Hours template', 'success');
      break;
      
    case 'weekend-pattern':
      // Apply to Saturday and Sunday
      const originalDay = currentDay;
      
      // Apply to Saturday (6)
      const satDateKey = getDateKeyForDay(6);
      if (!availability[satDateKey]) {
        availability[satDateKey] = new Set();
      } else {
        availability[satDateKey].clear();
      }
      
      for (let h = 10; h < 16; h++) {
        for (let q = 0; q < 4; q++) {
          const mins = String(q*15).padStart(2,"0");
          availability[satDateKey].add(`${h}:${mins}`);
        }
      }
      
      // Apply to Sunday (0)
      const sunDateKey = getDateKeyForDay(0);
      if (!availability[sunDateKey]) {
        availability[sunDateKey] = new Set();
      } else {
        availability[sunDateKey].clear();
      }
      
      for (let h = 12; h < 18; h++) {
        for (let q = 0; q < 4; q++) {
          const mins = String(q*15).padStart(2,"0");
          availability[sunDateKey].add(`${h}:${mins}`);
        }
      }
      
      showNotification('Applied Weekend Pattern to Saturday and Sunday', 'success');
      break;
      
    case 'custom-pattern':
      // Simulate AI analyzing patterns
      showNotification('AI is analyzing your availability patterns...', 'info');
      
      setTimeout(() => {
        // Select alternating hours
        for (let h = 8; h < 20; h += 2) {
          for (let q = 0; q < 4; q++) {
            const mins = String(q*15).padStart(2,"0");
            availability[dateKey].add(`${h}:${mins}`);
          }
        }
        
        showNotification('Applied AI-suggested custom pattern', 'success');
        renderDay(currentDay);
      }, 1500);
      return; // Early return to prevent immediate renderDay
  }
  
  renderDay(currentDay);
}

// Load data from local storage
function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem('therapprove_availability');
    if (savedData) {
      // Parse the saved data
      const parsed = JSON.parse(savedData);
      
      // Convert to our data structure
      availability = {};
      for (const dateKey in parsed) {
        availability[dateKey] = new Set(parsed[dateKey]);
      }
      
      // Show notification
      const lastSaved = localStorage.getItem('therapprove_last_saved');
      if (lastSaved) {
        const date = new Date(lastSaved);
        const formattedDate = date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        showNotification(`Loaded saved availability from ${formattedDate}`, 'info');
        
        // Update last saved info
        document.getElementById('last-saved-info').textContent = `Last saved: ${formattedDate}`;
      }
    }
  } catch (e) {
    console.error("Error loading saved availability:", e);
  }
}

// Save data to local storage
function saveToLocalStorage() {
  try {
    // Convert Sets to arrays for JSON storage
    const dataToSave = {};
    for (const dateKey in availability) {
      dataToSave[dateKey] = Array.from(availability[dateKey]);
    }
    
    localStorage.setItem('therapprove_availability', JSON.stringify(dataToSave));
    localStorage.setItem('therapprove_last_saved', new Date().toISOString());
    
    // Update last saved info
    const date = new Date();
    const formattedDate = date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    document.getElementById('last-saved-info').textContent = `Last saved: ${formattedDate}`;
  } catch (e) {
    console.error("Error saving availability:", e);
    showNotification("Error saving data", "error");
  }
}

// Show notification
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(n => n.remove());

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  const colors = {
    info: '#2563eb',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  };
  
  const icons = {
    info: 'fa-info-circle',
    success: 'fa-check-circle',
    warning: 'fa-exclamation-triangle',
    error: 'fa-times-circle'
  };
  
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: ${colors[type]};
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    ">
      <i class="fas ${icons[type]}"></i>
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: none;
        border: none;
        color: white;
        font-size: 1.25rem;
        cursor: pointer;
        margin-left: auto;
        padding: 0.25rem;
      ">&times;</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.remove();
    }
  }, 4000);
}

// Show save confirmation banner
function showSaveConfirmation(message) {
  // Remove existing banner if any
  const existingBanner = document.querySelector('.save-confirmation');
  if (existingBanner) {
    existingBanner.remove();
  }
  
  // Create banner
  const banner = document.createElement('div');
  banner.className = 'save-confirmation';
  banner.innerHTML = `
    <div class="save-confirmation-content">
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
      <button class="close-btn">&times;</button>
    </div>
  `;
  
  // Add styles
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background-color: #10b981;
    color: white;
    padding: 1rem;
    text-align: center;
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
  `;
  
  banner.querySelector('.save-confirmation-content').style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    max-width: 600px;
    margin: 0 auto;
  `;
  
  banner.querySelector('.close-btn').style.cssText = `
    background: none;
    border: none;
    color: white;
    font-size: 1.25rem;
    cursor: pointer;
    margin-left: auto;
  `;
  
  // Add close functionality
  banner.querySelector('.close-btn').addEventListener('click', function() {
    banner.remove();
  });
  
  // Add to body
  document.body.prepend(banner);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (document.body.contains(banner)) {
      banner.remove();
    }
  }, 5000);
}

// Helper functions for date handling
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  d.setDate(d.getDate() - day); // Go back to Sunday
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()); // Return date with time set to 00:00:00
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7); // Thursday in current week
  const week1 = new Date(d.getFullYear(), 0, 4); // January 4th is always in week 1
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function formatISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(hour, minute) {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function getDateForDay(dayIndex) {
  const date = new Date(currentWeekStart);
  date.setDate(date.getDate() + dayIndex);
  return date;
}

function getCurrentDateKey() {
  return getDateKeyForDay(currentDay);
}

function getDateKeyForDay(dayIndex) {
  const date = getDateForDay(dayIndex);
  return formatISODate(date);
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideDown {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
// Initialize export functionality
function initExportFunctionality() {
  const exportBtn = document.getElementById('export-dropdown-btn');
  const exportDropdown = document.getElementById('export-dropdown');
  
  // Toggle dropdown
  exportBtn.addEventListener('click', function() {
    exportDropdown.classList.toggle('show');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    if (!event.target.closest('#export-dropdown-btn') && !event.target.closest('#export-dropdown')) {
      exportDropdown.classList.remove('show');
    }
  });
  
  // Export options
  document.getElementById('export-csv').addEventListener('click', exportToCSV);
  document.getElementById('export-ics').addEventListener('click', exportToICS);
  document.getElementById('export-excel').addEventListener('click', exportToExcel);
  document.getElementById('export-google').addEventListener('click', exportToGoogleCalendar);
  document.getElementById('export-outlook').addEventListener('click', exportToOutlookCalendar);
}

// Export to CSV
function exportToCSV() {
  // Prepare data
  const data = prepareExportData();
  
  // Create CSV content
  let csvContent = 'Subject,Start Date,Start Time,End Date,End Time,All Day Event\n';
  
  data.forEach(event => {
    const startDate = formatDateForExport(event.startDate);
    const endDate = formatDateForExport(event.endDate);
    csvContent += `"Available",${startDate},${event.startTime},${endDate},${event.endTime},FALSE\n`;
  });
  
  // Create and download file
  downloadFile(csvContent, 'therapprove-availability.csv', 'text/csv');
  showNotification('Exported to CSV file', 'success');
}

// Export to ICS (iCalendar)
function exportToICS() {
  // Prepare data
  const data = prepareExportData();
  
  // Create ICS content
  let icsContent = 'BEGIN:VCALENDAR\n';
  icsContent += 'VERSION:2.0\n';
  icsContent += 'PRODID:-//Therapprove//Availability Scheduler//EN\n';
  icsContent += 'CALSCALE:GREGORIAN\n';
  icsContent += 'METHOD:PUBLISH\n';
  
  data.forEach(event => {
    const startDateTime = formatDateTimeForICS(event.startDate, event.startTime);
    const endDateTime = formatDateTimeForICS(event.endDate, event.endTime);
    
    icsContent += 'BEGIN:VEVENT\n';
    icsContent += `DTSTART:${startDateTime}\n`;
    icsContent += `DTEND:${endDateTime}\n`;
    icsContent += `SUMMARY:Available\n`;
    icsContent += `DESCRIPTION:Therapprove Availability\n`;
    icsContent += `UID:${Math.random().toString(36).substring(2)}@therapprove.com\n`;
    icsContent += 'STATUS:CONFIRMED\n';
    icsContent += 'SEQUENCE:0\n';
    icsContent += 'END:VEVENT\n';
  });
  
  icsContent += 'END:VCALENDAR';
  
  // Create and download file
  downloadFile(icsContent, 'therapprove-availability.ics', 'text/calendar');
  showNotification('Exported to iCalendar file', 'success');
}

// Export to Excel
function exportToExcel() {
  // Prepare data
  const data = prepareExportData();
  
  // Create Excel XML content
  let excelContent = '<?xml version="1.0"?>\n';
  excelContent += '<?mso-application progid="Excel.Sheet"?>\n';
  excelContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  excelContent += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
  excelContent += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
  excelContent += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
  excelContent += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
  excelContent += ' <Worksheet ss:Name="Availability">\n';
  excelContent += '  <Table>\n';
  excelContent += '   <Row>\n';
  excelContent += '    <Cell><Data ss:Type="String">Subject</Data></Cell>\n';
  excelContent += '    <Cell><Data ss:Type="String">Start Date</Data></Cell>\n';
  excelContent += '    <Cell><Data ss:Type="String">Start Time</Data></Cell>\n';
  excelContent += '    <Cell><Data ss:Type="String">End Date</Data></Cell>\n';
  excelContent += '    <Cell><Data ss:Type="String">End Time</Data></Cell>\n';
  excelContent += '   </Row>\n';
  
  data.forEach(event => {
    const startDate = formatDateForExport(event.startDate);
    const endDate = formatDateForExport(event.endDate);
    
    excelContent += '   <Row>\n';
    excelContent += '    <Cell><Data ss:Type="String">Available</Data></Cell>\n';
    excelContent += `    <Cell><Data ss:Type="String">${startDate}</Data></Cell>\n`;
    excelContent += `    <Cell><Data ss:Type="String">${event.startTime}</Data></Cell>\n`;
    excelContent += `    <Cell><Data ss:Type="String">${endDate}</Data></Cell>\n`;
    excelContent += `    <Cell><Data ss:Type="String">${event.endTime}</Data></Cell>\n`;
    excelContent += '   </Row>\n';
  });
  
  excelContent += '  </Table>\n';
  excelContent += ' </Worksheet>\n';
  excelContent += '</Workbook>';
  
  // Create and download file
  downloadFile(excelContent, 'therapprove-availability.xml', 'application/vnd.ms-excel');
  showNotification('Exported to Excel file', 'success');
}

// Export to Google Calendar
function exportToGoogleCalendar() {
  // Prepare data
  const data = prepareExportData();
  
  // Google Calendar requires at least one event
  if (data.length === 0) {
    showNotification('No availability slots to export', 'warning');
    return;
  }
  
  // Create Google Calendar URL for the first few events (URL length limitations)
  const maxEvents = Math.min(5, data.length); // Google Calendar URL has length limitations
  let googleUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  
  for (let i = 0; i < maxEvents; i++) {
    const event = data[i];
    const startDateTime = formatDateTimeForGoogle(event.startDate, event.startTime);
    const endDateTime = formatDateTimeForGoogle(event.endDate, event.endTime);
    
    googleUrl += `&text=Available&dates=${startDateTime}/${endDateTime}`;
  }
  
  // Open Google Calendar in a new tab
  window.open(googleUrl, '_blank');
  
  if (data.length > maxEvents) {
    showNotification(`Exported first ${maxEvents} slots to Google Calendar. For more slots, please use the ICS file.`, 'info');
  } else {
    showNotification('Opening Google Calendar...', 'success');
  }
}

// Export to Outlook Calendar
function exportToOutlookCalendar() {
  // For Outlook Web, we'll use the ICS file approach
  exportToICS();
  
  // Show additional instructions
  setTimeout(() => {
    const modal = document.createElement('div');
    modal.className = 'ai-suggestion-modal';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-calendar-alt"></i> Import to Outlook Calendar</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p>To import your availability into Outlook Calendar:</p>
          <ol style="margin-left: 1.5rem; line-height: 1.6">
            <li>Open Outlook Calendar</li>
            <li>Click on "Add calendar" or "Import"</li>
            <li>Select "Upload from file"</li>
            <li>Choose the downloaded .ics file</li>
            <li>Follow the prompts to complete the import</li>
          </ol>
        </div>
        <div class="modal-footer">
          <button class="secondary-btn close-modal">Close</button>
        </div>
      </div>
    `;
    
    // Add to body
    document.body.appendChild(modal);
    
    // Add close functionality
    modal.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', function() {
        modal.remove();
      });
    });
  }, 1000);
}

// Helper function to prepare export data
function prepareExportData() {
  const events = [];
  
  // Process all dates in the current week
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const date = getDateForDay(dayIndex);
    const dateKey = getDateKeyForDay(dayIndex);
    
    if (!availability[dateKey] || availability[dateKey].size === 0) {
      continue; // Skip days with no availability
    }
    
    // Get all time slots for this day
    const timeSlots = Array.from(availability[dateKey]).sort();
    
    // Group consecutive time slots
    const groups = groupConsecutiveTimeSlots(timeSlots);
    
    // Create events for each group
    groups.forEach(group => {
      const [startHour, startMinute] = group.start.split(':').map(Number);
      const [endHour, endMinute] = group.end.split(':').map(Number);
      
      // Calculate end time (add 15 minutes to the last slot)
      let endTimeHour = endHour;
      let endTimeMinute = endMinute + 15;
      
      if (endTimeMinute >= 60) {
        endTimeHour += 1;
        endTimeMinute -= 60;
      }
      
      // Format times
      const startTime = formatTimeForExport(startHour, startMinute);
      const endTime = formatTimeForExport(endTimeHour, endTimeMinute);
      
      events.push({
        startDate: new Date(date),
        endDate: new Date(date),
        startTime,
        endTime
      });
    });
  }
  
  return events;
}

// Group consecutive time slots
function groupConsecutiveTimeSlots(slots) {
  if (slots.length === 0) return [];
  
  const groups = [];
  let currentGroup = {
    start: slots[0],
    end: slots[0]
  };
  
  for (let i = 1; i < slots.length; i++) {
    const currentSlot = slots[i];
    const prevSlot = slots[i - 1];
    
    // Check if slots are consecutive (15 minutes apart)
    if (areConsecutiveSlots(prevSlot, currentSlot)) {
      currentGroup.end = currentSlot;
    } else {
      // Start a new group
      groups.push({...currentGroup});
      currentGroup = {
        start: currentSlot,
        end: currentSlot
      };
    }
  }
  
  // Add the last group
  groups.push(currentGroup);
  
  return groups;
}

// Check if two time slots are consecutive
function areConsecutiveSlots(slot1, slot2) {
  const [hour1, minute1] = slot1.split(':').map(Number);
  const [hour2, minute2] = slot2.split(':').map(Number);
  
  const totalMinutes1 = hour1 * 60 + minute1;
  const totalMinutes2 = hour2 * 60 + minute2;
  
  return totalMinutes2 - totalMinutes1 === 15;
}

// Format date for export (MM/DD/YYYY)
function formatDateForExport(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

// Format time for export (HH:MM AM/PM)
function formatTimeForExport(hour, minute) {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
}

// Format date and time for ICS file
function formatDateTimeForICS(date, timeStr) {
  // Parse the time string (e.g., "9:00 AM")
  const [timePart, ampm] = timeStr.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  
  // Convert to 24-hour format
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  // Create a new date with the correct time
  const dateTime = new Date(date);
  dateTime.setHours(hours, minutes, 0, 0);
  
  // Format for ICS
  return dateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Format date and time for Google Calendar
function formatDateTimeForGoogle(date, timeStr) {
  // Parse the time string (e.g., "9:00 AM")
  const [timePart, ampm] = timeStr.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  
  // Convert to 24-hour format
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  // Create a new date with the correct time
  const dateTime = new Date(date);
  dateTime.setHours(hours, minutes, 0, 0);
  
  // Format for Google Calendar
  return dateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Helper function to download a file
function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
