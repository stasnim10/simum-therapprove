// ===== PRODUCTION-READY REFERRAL WORKBOARD =====

// ------- helpers -------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

let state = {
  search: '',
  zip: $('#locationInput')?.value?.trim() || '46077',
  radius: Number($('#radiusSelect')?.value || 25),
  stage: '',
  insurance: '',
  priority: '',
  owner: '',
  sortKey: 'patientName',
  sortDir: 'asc',
  view: 'list'
};

// Haversine (mi)
function distanceMi(a, b) {
  if (!a || !b) return Infinity;
  const toRad = d => d * Math.PI / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

// ZIP geocoding cache - replace with real geocoder in production
const zipCache = new Map();
async function geocodeZip(zip) {
  if (!zip || zip.length !== 5) return null;
  if (zipCache.has(zip)) return zipCache.get(zip);
  
  // Seed common zips for demo - expand as needed
  const table = {
    '46077': {lat: 39.9506, lng: -86.2625}, // Zionsville
    '46240': {lat: 39.9164, lng: -86.1085}, // Indianapolis
    '46032': {lat: 39.9784, lng: -86.1180}, // Carmel
    '46060': {lat: 40.0456, lng: -86.0086}, // Noblesville
    '46038': {lat: 39.9568, lng: -85.9685}, // Fishers
    '40207': {lat: 38.2527, lng: -85.7585}, // Louisville, KY
    '40202': {lat: 38.2542, lng: -85.7594}, // Louisville downtown
    '27601': {lat: 35.7796, lng: -78.6382}, // Raleigh, NC
    '28202': {lat: 35.2271, lng: -80.8431}, // Charlotte, NC
    '60601': {lat: 41.8781, lng: -87.6298}, // Chicago, IL
  };
  
  const coords = table[zip] || null;
  zipCache.set(zip, coords);
  return coords;
}

// Debounce utility
function debounce(fn, t=250) { 
  let id; 
  return (...a) => { 
    clearTimeout(id); 
    id = setTimeout(() => fn(...a), t);
  }
}

// Business logic: Define "Urgent" as waitDays >= 30 OR (stage === 'new' && waitDays >= 7)
function isUrgent(referral) {
  return referral.waitDays >= 30 || (referral.stage === 'new' && referral.waitDays >= 7);
}

// ------- data pipeline -------
async function applyFilters() {
  // Show loading overlay for distance calculations
  const loading = $('#loadingOverlay');
  if (loading && state.zip) {
    loading.classList.add('show');
    loading.setAttribute('aria-hidden', 'false');
  }

  const providerLoc = await geocodeZip(state.zip);
  let rows = (window.referrals || []).slice();

  // search
  if (state.search) {
    const q = state.search.toLowerCase();
    rows = rows.filter(r =>
      r.patientName.toLowerCase().includes(q) ||
      r.city?.toLowerCase().includes(q) ||
      r.state?.toLowerCase().includes(q) ||
      r.insurance?.toLowerCase().includes(q) ||
      r.therapyType?.toLowerCase().includes(q)
    );
  }

  // filters
  if (state.stage)     rows = rows.filter(r => r.stage === state.stage);
  if (state.insurance) rows = rows.filter(r => r.insurance === state.insurance);
  if (state.priority)  rows = rows.filter(r => r.priority === state.priority);
  if (state.owner) {
    if (state.owner === 'me') rows = rows.filter(r => r.owner === 'me');
    else if (state.owner === 'unassigned') rows = rows.filter(r => !r.owner);
    else rows = rows.filter(r => r.owner === state.owner);
  }

  // distance calculation and filtering
  let within = 0, distances = [];
  if (providerLoc) {
    rows = rows.map(r => {
      const d = (r.lat && r.lng) ? distanceMi(providerLoc, {lat: r.lat, lng: r.lng}) : Infinity;
      r._distance = d;
      if (d <= state.radius) within++;
      if (Number.isFinite(d)) distances.push(d);
      return r;
    }).filter(r => r._distance <= state.radius || !Number.isFinite(r._distance));
  }

  // sort
  rows.sort((a,b) => {
    const k = state.sortKey;
    const av = (k==='distance' ? (a._distance ?? Infinity) : a[k]);
    const bv = (k==='distance' ? (b._distance ?? Infinity) : b[k]);
    if (av==null && bv==null) return 0;
    if (av==null) return 1;
    if (bv==null) return -1;
    const cmp = (typeof av==='number' && typeof bv==='number') ? av-bv : String(av).localeCompare(String(bv));
    return state.sortDir==='asc' ? cmp : -cmp;
  });

  // Hide loading overlay
  if (loading) {
    setTimeout(() => {
      loading.classList.remove('show');
      loading.setAttribute('aria-hidden', 'true');
    }, 200);
  }

  render(rows, {within, distances});
}

function distanceBadgeClass(d) {
  if (!Number.isFinite(d)) return '';
  if (d <= 10) return 'close';
  if (d <= 25) return 'medium';
  return 'far';
}

// ------- renderers -------
// Animated number counter function
function animateNumber(element, targetValue, duration = 800) {
  if (!element) return;
  
  const startValue = parseInt(element.textContent) || 0;
  const difference = targetValue - startValue;
  const startTime = performance.now();
  
  function updateNumber(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function for smooth animation
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = Math.round(startValue + (difference * easeOutQuart));
    
    element.textContent = currentValue;
    
    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    } else {
      element.textContent = targetValue; // Ensure final value is exact
    }
  }
  
  requestAnimationFrame(updateNumber);
}

// Enhanced render function with animations
function render(rows, meta) {
  // insights
  const total = rows.length;
  const urgent = rows.filter(r => isUrgent(r)).length;
  
  // Calculate distances properly
  const validDistances = rows
    .map(r => r._distance)
    .filter(d => Number.isFinite(d) && d > 0);
  
  const within = rows.filter(r => Number.isFinite(r._distance) && r._distance <= state.radius).length;
  const avgDist = validDistances.length > 0 
    ? (validDistances.reduce((a,b) => a+b, 0) / validDistances.length).toFixed(1)
    : '–';
  
  // Animate the numbers instead of just setting them
  const totalEl = $('#insightTotal');
  const withinEl = $('#insightWithin');
  const urgentEl = $('#insightUrgent');
  const radiusEl = $('#insightRadius');
  const avgDistEl = $('#insightAvgDist');
  
  if (totalEl) animateNumber(totalEl, total);
  if (withinEl) animateNumber(withinEl, within);
  if (urgentEl) animateNumber(urgentEl, urgent);
  if (radiusEl) animateNumber(radiusEl, state.radius);
  if (avgDistEl) avgDistEl.textContent = avgDist;

  // Announce results for screen readers
  const banner = $('#insightsBanner');
  if (banner) {
    banner.setAttribute('aria-live', 'polite');
  }

  // render current view
  if (state.view === 'list') renderTable(rows);
  else if (state.view === 'kanban') renderKanban(rows);
  else if (state.view === 'map') renderMap(rows);
}

function renderTable(rows) {
  const tbody = $('#referralsTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state" style="text-align: center; padding: 2rem;">
          <i class="fas fa-inbox" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;" aria-hidden="true"></i>
          <h3>No referrals match your filters</h3>
          <p>Try widening your radius, clearing a filter, or removing your search.</p>
        </div>
      </td></tr>`;
    return;
  }

  const frag = document.createDocumentFragment();
  rows.forEach(r => {
    const tr = document.createElement('tr');
    const distTxt = Number.isFinite(r._distance) ? `${r._distance.toFixed(1)} mi` : '—';
    const urgentClass = isUrgent(r) ? 'urgent' : r.priority;
    
    // Add data attributes for fast filtering/sorting
    tr.setAttribute('data-stage', r.stage);
    tr.setAttribute('data-insurance', r.insurance);
    tr.setAttribute('data-owner', r.owner || '');
    tr.setAttribute('data-zip', r.zip);
    tr.setAttribute('data-distance', r._distance || '');
    tr.setAttribute('data-waitdays', r.waitDays);
    tr.setAttribute('data-priority', r.priority);
    
    tr.innerHTML = `
      <td class="select-col"><input type="checkbox" aria-label="Select ${r.patientName}"></td>
      <td class="patient-cell">
        <div class="patient-info">
          <div class="patient-name">${r.patientName}</div>
          <div class="patient-details">#${r.id} • ${r.therapyType} • ${r.age}</div>
        </div>
      </td>
      <td><span class="stage-badge ${r.stage}">${r.stage.replace('-',' ')}</span></td>
      <td>
        <span class="insurance-pill ${r.insurance?.toLowerCase() || ''}">${r.insurance}</span>
      </td>
      <td>
        <div class="location-info">
          <span class="zip">${r.zip || ''}</span>
          <span class="distance-badge ${distanceBadgeClass(r._distance)}">${distTxt}</span>
        </div>
      </td>
      <td><span class="owner-name">${r.owner || 'Unassigned'}</span></td>
      <td><span class="sla-badge ${urgentClass}">${r.priority.replace('-',' ')}</span></td>
      <td><span class="wait-days ${r.waitDays>60?'overdue':r.waitDays>30?'warning':'normal'}">${r.waitDays}d</span></td>
      <td class="actions-cell">
        <button class="action-btn" data-id="${r.id}" type="button" title="Quick contact - call/SMS ${r.parentName}">
          <i class="fas fa-phone"></i> Contact
        </button>
      </td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

// Simple renderKanban without excessive animations
function renderKanban(rows) {
  const stages = ['new', 'benefit-check', 'pcp-referral', 'ready-schedule', 'scheduled'];
  
  stages.forEach(stage => {
    const stageRows = rows.filter(r => r.stage === stage);
    const columnId = {
      'new': 'newColumn',
      'benefit-check': 'benefitColumn', 
      'pcp-referral': 'pcpColumn',
      'ready-schedule': 'readyColumn',
      'scheduled': 'scheduledColumn'
    }[stage];
    
    const countId = {
      'new': 'newCount',
      'benefit-check': 'benefitCount',
      'pcp-referral': 'pcpCount', 
      'ready-schedule': 'readyCount',
      'scheduled': 'scheduledCount'
    }[stage];
    
    const column = $('#' + columnId);
    const count = $('#' + countId);
    
    if (count) count.textContent = stageRows.length;
    
    if (column) {
      column.innerHTML = stageRows.map(r => {
        const distTxt = Number.isFinite(r._distance) ? `${r._distance.toFixed(1)} mi` : '';
        const urgentClass = isUrgent(r) ? 'urgent' : r.priority;
        
        return `
          <div class="kanban-card" tabindex="0" data-id="${r.id}">
            <div class="card-header">
              <strong>${r.patientName}</strong>
              <span class="priority-dot ${urgentClass}" title="${r.priority.replace('-',' ')}"></span>
            </div>
            <div class="card-body">
              <div class="card-detail">
                <i class="fas fa-map-marker-alt"></i>
                ${r.city}, ${r.state} ${distTxt ? `(${distTxt})` : ''}
              </div>
              <div class="card-detail">
                <i class="fas fa-user-md"></i>
                ${r.therapyType} • ${r.age}
              </div>
              <div class="card-detail">
                <i class="fas fa-clock"></i>
                ${r.waitDays} days waiting
              </div>
            </div>
            <div class="card-footer">
              <span>${r.insurance.toUpperCase()} • ${r.owner || 'Unassigned'}</span>
              <button class="card-action" data-id="${r.id}" type="button" title="Quick contact">
                <i class="fas fa-phone"></i> Contact
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  });
}

// Clear filters function
function clearAllFilters() {
  // Reset state
  state.search = '';
  state.stage = '';
  state.insurance = '';
  state.priority = '';
  state.owner = '';
  state.zip = '46077';
  state.radius = 25;
  
  // Reset form elements
  const searchInput = $('#searchInput');
  const locInput = $('#locationInput');
  const radiusSelect = $('#radiusSelect');
  const stageFilter = $('#stageFilter');
  const insuranceFilter = $('#insuranceFilter');
  const priorityFilter = $('#priorityFilter');
  const ownerFilter = $('#ownerFilter');
  
  if (searchInput) searchInput.value = '';
  if (locInput) locInput.value = '46077';
  if (radiusSelect) radiusSelect.value = '25';
  if (stageFilter) stageFilter.value = '';
  if (insuranceFilter) insuranceFilter.value = '';
  if (priorityFilter) priorityFilter.value = '';
  if (ownerFilter) ownerFilter.value = '';
  
  // Reset chips and saved views
  $$('.location-chip').forEach(chip => chip.setAttribute('aria-pressed', 'false'));
  $$('.saved-view-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', 'false');
    btn.classList.remove('active');
  });
  
  // Set "All Referrals" as active
  const allBtn = $('[data-view="all"]');
  if (allBtn) {
    allBtn.setAttribute('aria-pressed', 'true');
    allBtn.classList.add('active');
  }
  
  // Re-apply filters
  applyFilters();
}

function renderMap(rows) {
  // Update map stats
  const mapTotal = $('#mapTotalReferrals');
  const mapAvgDist = $('#mapAvgDistance');
  
  if (mapTotal) mapTotal.textContent = rows.length;
  
  // Calculate average distance for map
  const validDistances = rows
    .map(r => r._distance)
    .filter(d => Number.isFinite(d) && d > 0);
  
  const avgDist = validDistances.length > 0 
    ? (validDistances.reduce((a,b) => a+b, 0) / validDistances.length).toFixed(1)
    : '–';
    
  if (mapAvgDist) mapAvgDist.textContent = avgDist;
  
  // Google Maps is embedded via iframe, so no additional rendering needed
  // In a production environment, you would use Google Maps JavaScript API
  // to dynamically add markers based on the filtered referrals
}

// ------- events -------
function initEvents() {
  // search with debounce
  const onSearch = debounce(e => { 
    state.search = e.target.value.trim(); 
    applyFilters(); 
  }, 200);
  $('#searchInput')?.addEventListener('input', onSearch);

  // filters
  $('#locationInput')?.addEventListener('change', e => { 
    state.zip = e.target.value.trim(); 
    applyFilters(); 
  });
  $('#radiusSelect')?.addEventListener('change', e => { 
    state.radius = Number(e.target.value); 
    applyFilters(); 
  });
  $('#stageFilter')?.addEventListener('change', e => { 
    state.stage = e.target.value; 
    applyFilters(); 
  });
  $('#insuranceFilter')?.addEventListener('change', e => { 
    state.insurance = e.target.value; 
    applyFilters(); 
  });
  $('#priorityFilter')?.addEventListener('change', e => { 
    state.priority = e.target.value; 
    applyFilters(); 
  });
  $('#ownerFilter')?.addEventListener('change', e => { 
    state.owner = e.target.value; 
    applyFilters(); 
  });

  // Tab/view wiring (accessibility-friendly)
  const tabs = $$('.view-btn');
  const panels = {
    list: $('#listView'),
    kanban: $('#kanbanView'),
    map: $('#mapView')
  };

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      // aria-selected
      tabs.forEach(b => b.setAttribute('aria-selected','false'));
      btn.setAttribute('aria-selected','true');

      // show/hide + hidden attribute
      Object.entries(panels).forEach(([viewName, panel]) => { 
        if (panel) {
          const isActive = viewName === btn.dataset.view;
          panel.style.display = isActive ? '' : 'none';
          if (isActive) {
            panel.removeAttribute('hidden');
          } else {
            panel.setAttribute('hidden', '');
          }
        }
      });
      
      const panel = panels[btn.dataset.view];
      if (panel) {
        // focus into panel
        panel.setAttribute('tabindex','-1');
        panel.focus({preventScroll:false});
      }
      
      state.view = btn.dataset.view;
      applyFilters();
    });
  });

  // Sort header → aria-sort updates
  const headers = $$('.referrals-table th.sortable');
  headers.forEach(th => th.addEventListener('click', () => {
    const key = th.dataset.sort;
    const current = th.getAttribute('aria-sort');
    const next = current === 'ascending' ? 'descending' : 'ascending';
    
    // Update state
    state.sortKey = key;
    state.sortDir = next === 'ascending' ? 'asc' : 'desc';
    
    // Update ARIA
    headers.forEach(h => h.removeAttribute('aria-sort'));
    th.setAttribute('aria-sort', next);
    
    applyFilters();
  }));

  // Bulk actions enable/disable
  const tbody = $('#referralsTableBody');
  const bulkBtns = $$('.bulk-btn');
  const selectedCount = $('.selected-count');
  
  function updateBulkState() {
    const selected = tbody ? tbody.querySelectorAll('input[type="checkbox"]:checked').length : 0;
    if (selectedCount) selectedCount.textContent = `${selected} selected`;
    bulkBtns.forEach(b => b.disabled = selected === 0);
  }
  
  if (tbody) {
    tbody.addEventListener('change', e => {
      if (e.target.type === 'checkbox') updateBulkState();
    });
  }
  
  const selectAll = $('#selectAll');
  if (selectAll && tbody) {
    selectAll.addEventListener('change', e => {
      tbody.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = e.target.checked);
      updateBulkState();
    });
  }

  // Sidebar collapse toggle
  const sidebarToggle = $('.sidebar-toggle');
  const sidebar = $('#sidebar');
  const mainContent = $('.main-content');
  
  if (sidebarToggle && sidebar && mainContent) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('sidebar-collapsed');
      
      const isCollapsed = sidebar.classList.contains('collapsed');
      sidebarToggle.setAttribute('aria-pressed', isCollapsed.toString());
      sidebarToggle.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    });
  }

  // quick chips with aria-pressed
  $$('.location-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle active state and aria-pressed
      const wasActive = btn.getAttribute('aria-pressed') === 'true';
      $$('.location-chip').forEach(x => x.setAttribute('aria-pressed', 'false'));
      
      if (!wasActive) {
        btn.setAttribute('aria-pressed', 'true');
        const chip = btn.dataset.chip;
        
        // Clear other filters first
        state.stage = '';
        state.priority = '';
        
        if (chip === 'urgent') {
          state.priority = 'urgent';
        } else {
          // Set location by region
          const regionZip = {
            'indianapolis': '46240', 
            'kentucky': '40202', 
            'illinois': '60601', 
            'north-carolina': '28202'
          }[chip];
          
          if (regionZip) {
            state.zip = regionZip;
            const locInput = $('#locationInput');
            if (locInput) locInput.value = state.zip;
          }
        }
        
        // Update filter dropdowns to reflect state
        const stageFilter = $('#stageFilter');
        const priorityFilter = $('#priorityFilter');
        if (stageFilter) stageFilter.value = state.stage;
        if (priorityFilter) priorityFilter.value = state.priority;
      } else {
        // Deactivate - clear filters
        state.stage = '';
        state.priority = '';
        const stageFilter = $('#stageFilter');
        const priorityFilter = $('#priorityFilter');
        if (stageFilter) stageFilter.value = '';
        if (priorityFilter) priorityFilter.value = '';
      }
      
      applyFilters();
    });
  });

  // saved views with aria-pressed and business logic
  $$('.saved-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle active state and aria-pressed
      $$('.saved-view-btn').forEach(x => {
        x.setAttribute('aria-pressed', 'false');
        x.classList.remove('active');
      });
      btn.setAttribute('aria-pressed', 'true');
      btn.classList.add('active');
      
      // Clear filters first
      state.stage = '';
      state.priority = '';
      state.owner = '';
      
      const view = btn.dataset.view;
      if (view === 'needs-referral') {
        state.stage = 'pcp-referral';
      } else if (view === 'blocked-pa') {
        // Show overdue referrals (simulating PA blocks)
        state.priority = 'overdue';
      } else if (view === 'ready-schedule') {
        state.stage = 'ready-schedule';
      } else if (view === 'due-today') {
        state.priority = 'due-today';
      }
      
      // Update filter dropdowns
      const stageFilter = $('#stageFilter');
      const priorityFilter = $('#priorityFilter');
      const ownerFilter = $('#ownerFilter');
      if (stageFilter) stageFilter.value = state.stage;
      if (priorityFilter) priorityFilter.value = state.priority;
      if (ownerFilter) ownerFilter.value = state.owner;
      
      applyFilters();
    });
  });

  // Clear filters button
  const clearFiltersBtn = $('.clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearAllFilters);
  }

  // Contact action with business logic
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-id]');
    if (btn && (btn.classList.contains('action-btn') || btn.classList.contains('card-action'))) {
      const id = Number(btn.dataset.id);
      const referral = window.referrals.find(r => r.id === id);
      
      if (referral) {
        // In production: trigger call/SMS workflow, log contact event, update KPIs
        const message = `Quick Contact: ${referral.patientName}
Phone: ${referral.phone}
Parent: ${referral.parentName}
Therapy: ${referral.therapyType}
Wait Time: ${referral.waitDays} days

Template: "Hi ${referral.parentName}, this is [Your Name] from Therapprove. I'm calling about ${referral.patientName}'s ${referral.therapyType} referral. Do you have a moment to discuss next steps?"`;
        
        alert(message);
        
        // TODO: In production, this would:
        // 1. Log contact event with timestamp
        // 2. Update "Avg Time to Touch" KPI
        // 3. Trigger call/SMS workflow
        // 4. Move referral to next stage if appropriate
      }
    }
  });
}

// ------- boot -------
window.addEventListener('DOMContentLoaded', async () => {
  // Realistic referral data with proper structure
  window.referrals = window.referrals || [
    {id:12847, patientName:'Johnson, Emma', zip:'46032', city:'Carmel', state:'IN', insurance:'ppo', stage:'scheduled', owner:'Sarah K.', priority:'normal', waitDays:8, therapyType:'ABA Therapy', age:'3y 2m', parentName:'Johnson, Sarah', phone:'(317) 555-0123', lat:39.9784, lng:-86.1180},
    {id:12848, patientName:'Martinez, Lucas', zip:'46077', city:'Zionsville', state:'IN', insurance:'hmo', stage:'new', owner:'Mike R.', priority:'normal', waitDays:31, therapyType:'Speech Therapy', age:'4y 8m', parentName:'Martinez, Carlos', phone:'(317) 555-0456', lat:39.9506, lng:-86.2625},
    {id:12849, patientName:'Chen, Sophia', zip:'46240', city:'Indianapolis', state:'IN', insurance:'epo', stage:'benefit-check', owner:'Lisa M.', priority:'due-today', waitDays:15, therapyType:'Occupational Therapy', age:'6y 1m', parentName:'Chen, Lisa', phone:'(317) 555-0789', lat:39.9164, lng:-86.1085},
    {id:12850, patientName:'Brown, Aiden', zip:'46060', city:'Noblesville', state:'IN', insurance:'ppo', stage:'ready-schedule', owner:'Sarah K.', priority:'normal', waitDays:22, therapyType:'Physical Therapy', age:'2y 9m', parentName:'Brown, Jennifer', phone:'(317) 555-0321', lat:40.0456, lng:-86.0086},
    {id:12851, patientName:'Garcia, Isabella', zip:'40207', city:'Louisville', state:'KY', insurance:'hmo', stage:'pcp-referral', owner:'', priority:'overdue', waitDays:85, therapyType:'Speech Therapy', age:'5y 3m', parentName:'Garcia, Maria', phone:'(502) 555-0654', lat:38.2527, lng:-85.7585},
    {id:12852, patientName:'Wilson, Michael', zip:'46038', city:'Fishers', state:'IN', insurance:'pos', stage:'benefit-check', owner:'Sarah K.', priority:'urgent', waitDays:67, therapyType:'ABA Therapy', age:'7y 0m', parentName:'Wilson, Amanda', phone:'(317) 555-0987', lat:39.9568, lng:-85.9685},
    {id:12853, patientName:'Davis, Emma', zip:'27601', city:'Raleigh', state:'NC', insurance:'epo', stage:'new', owner:'', priority:'normal', waitDays:8, therapyType:'Behavioral Therapy', age:'4y 5m', parentName:'Davis, Robert', phone:'(919) 555-1234', lat:35.7796, lng:-78.6382},
    {id:12854, patientName:'Thompson, Jake', zip:'60601', city:'Chicago', state:'IL', insurance:'hmo', stage:'ready-schedule', owner:'Mike R.', priority:'due-today', waitDays:31, therapyType:'ABA Therapy', age:'3y 8m', parentName:'Thompson, Sarah', phone:'(312) 555-5678', lat:41.8781, lng:-87.6298}
  ];

  // Initialize with "Due Today" as default (business strategy)
  const dueTodayBtn = $('[data-view="due-today"]');
  if (dueTodayBtn) {
    dueTodayBtn.setAttribute('aria-pressed', 'true');
    dueTodayBtn.click();
  }

  // Set default sort to Priority → Wait Days → Distance for speed to first touch
  state.sortKey = 'priority';
  state.sortDir = 'desc'; // urgent first
  
  // Set initial ARIA states
  $$('.location-chip').forEach(chip => chip.setAttribute('aria-pressed', 'false'));
  $$('.saved-view-btn').forEach(btn => btn.setAttribute('aria-pressed', 'false'));
  
  // Set initial view tab states
  const activeTab = $('.view-btn.active');
  if (activeTab) {
    activeTab.setAttribute('aria-selected', 'true');
    $$('.view-btn').forEach(tab => {
      if (tab !== activeTab) tab.setAttribute('aria-selected', 'false');
    });
  }

  // SIDEBAR TOGGLE - Fixed to work with header button
  console.log('Setting up sidebar toggle...');
  
  // Wait a bit to make sure DOM is fully loaded
  setTimeout(() => {
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    console.log('Found sidebar toggle:', sidebarToggle);
    
    if (sidebarToggle) {
      // Remove any existing event listeners
      sidebarToggle.replaceWith(sidebarToggle.cloneNode(true));
      const newSidebarToggle = document.querySelector('.sidebar-toggle');
      
      newSidebarToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Header sidebar toggle clicked!');
        
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebar && mainContent) {
          const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');
          
          if (isCurrentlyCollapsed) {
            // Expand
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
            console.log('Expanding sidebar');
          } else {
            // Collapse
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
            console.log('Collapsing sidebar');
          }
          
          // Update button state
          newSidebarToggle.setAttribute('aria-pressed', (!isCurrentlyCollapsed).toString());
          
          // Update icon
          const icon = newSidebarToggle.querySelector('i');
          if (icon) {
            icon.className = isCurrentlyCollapsed ? 'fas fa-angle-double-right' : 'fas fa-angle-double-left';
          }
        }
      });
      
      console.log('Event listener attached to sidebar toggle');
    } else {
      console.error('Sidebar toggle button not found');
    }
  }, 100);

  initEvents();
  applyFilters();
});
