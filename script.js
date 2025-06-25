// Enhanced Therapprove Location Filtering
document.addEventListener('DOMContentLoaded', function() {
    initializeLocationFiltering();
    initializeViewToggle();
    initializeTableInteractions();
    initializeMapView();
});

// Location Filtering Functionality
function initializeLocationFiltering() {
    const zipInput = document.getElementById('zip-input');
    const zipSearchBtn = document.querySelector('.zip-search-btn');
    const radiusButtons = document.querySelectorAll('.radius-btn');
    const locationChips = document.querySelectorAll('.location-chip');
    const clearFiltersBtn = document.querySelector('.clear-filters');

    // Zip Code Search
    zipSearchBtn.addEventListener('click', handleZipSearch);
    zipInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleZipSearch();
        }
    });

    // Input validation for zip code
    zipInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, ''); // Only digits
        if (value.length > 5) value = value.slice(0, 5);
        e.target.value = value;
    });

    // Radius Selection
    radiusButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            radiusButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const radius = this.dataset.radius;
            filterByRadius(radius);
            updateInsightsBanner();
        });
    });

    // Location Chips
    locationChips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Toggle active state
            this.classList.toggle('active');
            
            const location = this.dataset.location;
            filterByLocation(location, this.classList.contains('active'));
            updateInsightsBanner();
        });
    });

    // Clear All Filters
    clearFiltersBtn.addEventListener('click', function() {
        clearAllFilters();
    });
}

function handleZipSearch() {
    const zipInput = document.getElementById('zip-input');
    const zipCode = zipInput.value.trim();
    
    if (zipCode.length !== 5) {
        showNotification('Please enter a valid 5-digit zip code', 'warning');
        return;
    }

    // Simulate zip code validation and search
    showNotification(`Searching for patients near ${zipCode}...`, 'info');
    
    setTimeout(() => {
        filterByZipCode(zipCode);
        updateInsightsBanner();
        showNotification(`Found patients within selected radius of ${zipCode}`, 'success');
    }, 1000);
}

function filterByZipCode(zipCode) {
    const rows = document.querySelectorAll('.patient-row');
    const activeRadius = document.querySelector('.radius-btn.active').dataset.radius;
    
    // Simulate distance calculation and filtering
    rows.forEach(row => {
        const distance = parseFloat(row.dataset.distance);
        const shouldShow = distance <= parseInt(activeRadius);
        
        row.style.display = shouldShow ? '' : 'none';
        
        // Add visual indicator for zip-based search
        if (shouldShow) {
            row.classList.add('zip-filtered');
        }
    });
    
    updatePatientCount();
}

function filterByRadius(radius) {
    const rows = document.querySelectorAll('.patient-row');
    
    rows.forEach(row => {
        const distance = parseFloat(row.dataset.distance);
        const shouldShow = distance <= parseInt(radius);
        row.style.display = shouldShow ? '' : 'none';
    });
    
    updatePatientCount();
    showNotification(`Showing patients within ${radius} miles`, 'info');
}

function filterByLocation(location, isActive) {
    // Simulate filtering by clinic location
    const locationMap = {
        'indianapolis': ['46240', '46032'],
        'louisville': ['40202', '40204'],
        'lexington': ['40502', '40503']
    };
    
    const targetZips = locationMap[location] || [];
    const rows = document.querySelectorAll('.patient-row');
    
    if (isActive) {
        // Show only patients near this location
        rows.forEach(row => {
            const zipCode = row.querySelector('.zip-code').textContent;
            const shouldShow = targetZips.some(zip => zipCode.startsWith(zip.substring(0, 3)));
            row.style.display = shouldShow ? '' : 'none';
        });
        showNotification(`Showing patients near ${location}`, 'info');
    } else {
        // Reset filter for this location
        rows.forEach(row => {
            row.style.display = '';
        });
    }
    
    updatePatientCount();
}

function clearAllFilters() {
    // Reset all filters
    document.getElementById('zip-input').value = '';
    document.querySelectorAll('.radius-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.radius-btn[data-radius="25"]').classList.add('active');
    document.querySelectorAll('.location-chip').forEach(chip => chip.classList.remove('active'));
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    // Show all rows
    document.querySelectorAll('.patient-row').forEach(row => {
        row.style.display = '';
        row.classList.remove('zip-filtered');
    });
    
    updatePatientCount();
    updateInsightsBanner();
    showNotification('All filters cleared', 'info');
}

// View Toggle (Table/Map)
function initializeViewToggle() {
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const tableContainer = document.querySelector('.table-container');
    const mapContainer = document.getElementById('map-view');

    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            
            // Update active state
            toggleButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Switch views
            if (view === 'map') {
                tableContainer.style.display = 'none';
                mapContainer.style.display = 'block';
                showNotification('Switched to map view', 'info');
            } else {
                tableContainer.style.display = 'block';
                mapContainer.style.display = 'none';
                showNotification('Switched to table view', 'info');
            }
        });
    });
}

// Table Interactions
function initializeTableInteractions() {
    // Sortable columns
    const sortableHeaders = document.querySelectorAll('.patient-table th i');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const column = this.parentElement.textContent.trim().toLowerCase();
            sortTable(column);
        });
    });

    // Row click actions
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.title.toLowerCase();
            const patientName = this.closest('tr').querySelector('.patient-info strong').textContent;
            
            if (action.includes('view')) {
                showPatientDetails(patientName);
            } else if (action.includes('contact')) {
                initiateContact(patientName);
            }
        });
    });

    // Row hover effects for distance highlighting
    const patientRows = document.querySelectorAll('.patient-row');
    patientRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            const distance = this.dataset.distance;
            highlightSimilarDistances(distance);
        });
        
        row.addEventListener('mouseleave', function() {
            clearDistanceHighlights();
        });
    });
}

// Map View Interactions
function initializeMapView() {
    const mapPins = document.querySelectorAll('.map-pin');
    const mapControls = document.querySelectorAll('.map-control-btn');

    // Map pin interactions
    mapPins.forEach(pin => {
        pin.addEventListener('click', function() {
            const patientName = this.dataset.patient;
            showPatientDetails(patientName);
            
            // Highlight corresponding table row
            const tableRows = document.querySelectorAll('.patient-row');
            tableRows.forEach(row => {
                const rowPatientName = row.querySelector('.patient-info strong').textContent;
                if (rowPatientName === patientName) {
                    row.style.background = 'rgba(37, 99, 235, 0.1)';
                    setTimeout(() => {
                        row.style.background = '';
                    }, 2000);
                }
            });
        });
    });

    // Map controls
    mapControls.forEach(control => {
        control.addEventListener('click', function() {
            const icon = this.querySelector('i').className;
            
            if (icon.includes('plus')) {
                showNotification('Zooming in...', 'info');
            } else if (icon.includes('minus')) {
                showNotification('Zooming out...', 'info');
            } else if (icon.includes('crosshairs')) {
                showNotification('Centering map...', 'info');
            }
        });
    });
}

// Utility Functions
function updatePatientCount() {
    const visibleRows = document.querySelectorAll('.patient-row[style=""], .patient-row:not([style])');
    const totalRows = document.querySelectorAll('.patient-row').length;
    const countElement = document.querySelector('.patient-count');
    
    countElement.textContent = `Showing ${visibleRows.length} of ${totalRows} patients`;
}

function updateInsightsBanner() {
    const visibleRows = document.querySelectorAll('.patient-row[style=""], .patient-row:not([style])');
    const nearbyCount = Array.from(visibleRows).filter(row => 
        parseFloat(row.dataset.distance) <= 15
    ).length;
    
    const urgentCount = Array.from(visibleRows).filter(row => 
        row.querySelector('.wait-time.urgent')
    ).length;

    // Update insight cards
    const insightCards = document.querySelectorAll('.insight-card');
    if (insightCards[0]) {
        insightCards[0].querySelector('.insight-number').textContent = nearbyCount;
    }
    if (insightCards[1]) {
        insightCards[1].querySelector('.insight-number').textContent = urgentCount;
    }
}

function sortTable(column) {
    // Simulate table sorting
    showNotification(`Sorting by ${column}...`, 'info');
    
    // Add visual feedback
    const rows = Array.from(document.querySelectorAll('.patient-row'));
    
    if (column.includes('distance')) {
        rows.sort((a, b) => parseFloat(a.dataset.distance) - parseFloat(b.dataset.distance));
    } else if (column.includes('location')) {
        rows.sort((a, b) => {
            const zipA = a.querySelector('.zip-code').textContent;
            const zipB = b.querySelector('.zip-code').textContent;
            return zipA.localeCompare(zipB);
        });
    }
    
    // Re-append sorted rows
    const tbody = document.querySelector('.patient-table tbody');
    rows.forEach(row => tbody.appendChild(row));
}

function highlightSimilarDistances(targetDistance) {
    const rows = document.querySelectorAll('.patient-row');
    const target = parseFloat(targetDistance);
    
    rows.forEach(row => {
        const distance = parseFloat(row.dataset.distance);
        const diff = Math.abs(distance - target);
        
        if (diff <= 5) { // Within 5 miles
            row.style.background = 'rgba(6, 182, 212, 0.05)';
        }
    });
}

function clearDistanceHighlights() {
    document.querySelectorAll('.patient-row').forEach(row => {
        row.style.background = '';
    });
}

function showPatientDetails(patientName) {
    showNotification(`Opening details for ${patientName}`, 'info');
    
    // Simulate opening patient details modal/page
    setTimeout(() => {
        showNotification(`Patient details loaded for ${patientName}`, 'success');
    }, 1000);
}

function initiateContact(patientName) {
    showNotification(`Initiating contact with ${patientName}`, 'info');
    
    // Simulate contact action
    setTimeout(() => {
        showNotification(`Contact initiated for ${patientName}`, 'success');
    }, 1000);
}

// Notification System
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
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
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
    
    .zip-filtered {
        border-left: 3px solid #2563eb !important;
    }
`;
document.head.appendChild(style);

// Initialize insights banner on load
updateInsightsBanner();

console.log('Therapprove Location Enhancements loaded successfully!');
