/* ═══════════════════════════════════════════════════════════
   CrimeSight AI — Dashboard Logic
   Vadodara — Parul University Crime Prediction Dashboard
   ═══════════════════════════════════════════════════════════ */


/* ─── CROSS-PORT API BRIDGE ──────────────────────────────────
   Using a background Python HTTP API server on port 8588 to
   handle real-time synchronization between the Admin and User
   portals. This bypasses browser same-origin policies on ports.
   ─────────────────────────────────────────────────────────── */

/* ─── DATA ─────────────────────────────────────────────── */
function getSavedZones() {
  const defaultZones = [
    {id:"Z01", name:"Parul Campus Central",  risk:"Medium", color:"#ffb347", safety:72, safestTime:"Generally safe inside campus. Maintain caution at night.", lat:22.2925, lon:73.3639, crimes:["Theft (Cellphones)","Shoplifting","Fraud"], incidents:65, conf:0.88},
    {id:"Z02", name:"Limda Village",        risk:"High",   color:"#ff3860", safety:45, safestTime:"Avoid dark alleys after 9 PM. Travel in pairs.", lat:22.2905, lon:73.3695, crimes:["Assault","Robbery","Burglary"], incidents:92, conf:0.91},
    {id:"Z03", name:"Waghodia Crossing",    risk:"High",   color:"#ff3860", safety:49, safestTime:"Heavy highway traffic and isolated spots after 10 PM.", lat:22.2950, lon:73.3450, crimes:["Vehicle Theft","Pickpocketing","Robbery"], incidents:84, conf:0.85},
    {id:"Z04", name:"Parul Hospital Zone",  risk:"Medium", color:"#ffb347", safety:68, safestTime:"Active emergency response. Drive safely.", lat:22.2965, lon:73.3590, crimes:["Vandalism","Theft","Drug Offence"], incidents:52, conf:0.73},
    {id:"Z05", name:"Amrapali Township",    risk:"Low",    color:"#00e676", safety:90, safestTime:"Well-guarded township. Safe at all hours.", lat:22.2855, lon:73.3510, crimes:["Suspicious Vehicle","Trespassing","Littering"], incidents:42, conf:0.79},
    {id:"Z06", name:"Mastana Chowk Hub",    risk:"Low",    color:"#00e676", safety:86, safestTime:"Highly populated food hub. Extremely safe in evenings.", lat:22.2935, lon:73.3690, crimes:["Pocket Theft","Nuisance","Traffic Violation"], incidents:38, conf:0.81},
    {id:"Z07", name:"C V Raman Block",       risk:"Medium", color:"#ffb347", safety:80, safestTime:"Inside campus. Very safe, well lit at night.", lat:22.291895, lon:73.363215, crimes:["Theft (Cellphones)","Shoplifting"], incidents:12, conf:0.87}
  ];
  const custom = localStorage.getItem("trinetra_custom_zones");
  let zones = defaultZones;
  if (custom) {
    try {
      zones = JSON.parse(custom);
    } catch(e) {
      zones = defaultZones;
    }
  }
  
  // Ensure "C V Raman Block" is added if not present
  const hasCVRaman = zones.some(z => z.name === "C V Raman Block");
  if (!hasCVRaman) {
    zones.push({
      id: "Z07",
      name: "C V Raman Block",
      risk: "Medium",
      color: "#ffb347",
      safety: 80,
      safestTime: "Inside campus. Very safe, well lit at night.",
      lat: 22.291895,
      lon: 73.363215,
      crimes: ["Theft (Cellphones)","Shoplifting"],
      incidents: 12,
      conf: 0.87
    });
  }
  
  zones.forEach(z => {
    if (z.safety === undefined) {
      z.safety = z.risk === "High" ? 45 : z.risk === "Medium" ? 70 : 90;
    }
    if (!z.safestTime) {
      z.safestTime = z.risk === "High" ? "Avoid isolated spots at night. Travel in groups." : z.risk === "Medium" ? "Standard vigil at late hours. Safe during day." : "Safe neighborhood. Normal precaution.";
    }
    if (!z.crimes) {
      z.crimes = z.risk === "High" ? ["Assault", "Robbery"] : z.risk === "Medium" ? ["Theft", "Vandalism"] : ["Suspicious Activity"];
    }
    if (z.incidents === undefined) z.incidents = 0;
    if (z.conf === undefined) z.conf = 0.8;
  });
  
  localStorage.setItem("trinetra_custom_zones", JSON.stringify(zones));
  return zones;
}

let ZONES = getSavedZones();
window.zones = ZONES;

const CRIME_TYPES = ["All","Theft","Assault","Burglary","Drug","Vehicle","Vandalism","Fraud"];

const FEED_POOL = [
  {type:"Theft",         zone:"Limda Village",       risk:"High",   color:"#ff3860"},
  {type:"Assault",       zone:"Waghodia Crossing",   risk:"High",   color:"#ff3860"},
  {type:"Burglary",      zone:"Parul Campus Central", risk:"Medium", color:"#ffb347"},
  {type:"Vehicle Theft", zone:"Parul Hospital Zone",  risk:"Medium", color:"#ffb347"},
  {type:"Drug Offence",  zone:"Amrapali Township",    risk:"Low",    color:"#00e676"},
  {type:"Vandalism",     zone:"Mastana Chowk Hub",    risk:"Low",    color:"#00e676"},
  {type:"Robbery",       zone:"Limda Village",       risk:"High",   color:"#ff3860"},
  {type:"Fraud",         zone:"Parul Campus Central", risk:"Medium", color:"#ffb347"},
];

/* ─── STATE ────────────────────────────────────────────── */
let activeFilter = 'All';
let map, markers = [], routeLayer = null;

/* ─── MODALS & FORMS ───────────────────────────────────── */
window.openModal = function(id) {
  document.getElementById(id).style.display = 'flex';
  if(id === 'crimeModal') updateCrimeZoneDropdown();
};

window.closeModal = function(id) {
  document.getElementById(id).style.display = 'none';
};

function updateCrimeZoneDropdown() {
  var sel = document.getElementById('reportCrimeZone');
  if(!sel) return;
  sel.innerHTML = ZONES.map(function(z) { return '<option value="' + z.name + '">' + z.name + '</option>'; }).join('');
}

window.submitNewPlace = function() {
  var name = document.getElementById('newPlaceName').value.trim();
  var lat = parseFloat(document.getElementById('newPlaceLat').value);
  var lon = parseFloat(document.getElementById('newPlaceLon').value);
  var risk = document.getElementById('newPlaceRisk').value;
  
  if(!name || isNaN(lat) || isNaN(lon)) { alert('Please fill all fields correctly.'); return; }
  
  var color = risk === 'High' ? '#ff3860' : risk === 'Medium' ? '#ffb347' : '#00e676';
  var newZone = {
    id: "Z" + String(ZONES.length + 1).padStart(2, '0'),
    name: name, risk: risk, color: color, incidents: 0, lat: lat, lon: lon, conf: 0.8,
    safety: risk === 'High' ? 45 : risk === 'Medium' ? 70 : 90,
    safestTime: risk === 'High' ? "Avoid isolated spots at night. Travel in groups." : risk === 'Medium' ? "Standard vigil at late hours. Safe during day." : "Safe neighborhood. Normal precaution.",
    crimes: risk === 'High' ? ["Assault", "Robbery"] : risk === 'Medium' ? ["Theft", "Vandalism"] : ["Suspicious Activity"]
  };
  
  ZONES.push(newZone);
  window.zones = ZONES;
  
  localStorage.setItem("trinetra_custom_zones", JSON.stringify(ZONES));
  localStorage.setItem("trinetra_new_zone_added", JSON.stringify(newZone));
  localStorage.setItem("trinetra_zones_updated", Date.now());
  
  // POST updated zones to bridge
  postStateToBridge({ zones: ZONES });
  
  closeModal('placeModal');
  
  // Refresh UI
  renderMarkers(24);
  buildZoneList();
  updateTopStats();
  
  // Alert
  var tbody = document.getElementById('alertLogBody');
  if(tbody) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="font-family:\'JetBrains Mono\';font-size:0.75rem;">' + new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) + '</td><td>' + name + '</td><td style="color:var(--accent);">New Zone Added</td><td><span class="z-badge" style="color:var(--accent);background:var(--accentBg);">System</span></td>';
    tbody.insertBefore(tr, tbody.firstChild);
  }
};

window.submitCrimeReport = function() {
  var zoneName = document.getElementById('reportCrimeZone').value;
  var type = document.getElementById('reportCrimeType').value;
  var risk = document.getElementById('reportCrimeRisk').value;
  
  var zone = ZONES.find(function(z){ return z.name === zoneName; });
  if(!zone) return;
  
  // Update zone stats
  zone.incidents += 1;
  
  // Adjust zone risk if needed (simple heuristic)
  if(risk === 'High' && zone.risk !== 'High') {
    zone.risk = 'High'; zone.color = '#ff3860';
  } else if (risk === 'Medium' && zone.risk === 'Low') {
    zone.risk = 'Medium'; zone.color = '#ffb347';
  }
  
  var color = risk === 'High' ? '#ff3860' : risk === 'Medium' ? '#ffb347' : '#00e676';
  
  var newFeed = { type: type, zone: zoneName, risk: risk, color: color };
  FEED_POOL.push(newFeed);
  closeModal('crimeModal');
  
  // Trigger UI updates
  var time = new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  
  var list = document.getElementById('feedList');
  var div = document.createElement('div');
  div.className = 'feed-item';
  div.innerHTML = '<div class="feed-dot" style="background:' + color + ';box-shadow:0 0 4px ' + color + '"></div>'
    + '<div class="feed-text"><div class="feed-type">' + type + ' (Manual Report)</div><div class="feed-zone">' + zoneName + '</div></div>'
    + '<div class="feed-time">' + time + '</div>';
  list.insertBefore(div, list.firstChild);
  if(list.children.length > 8) list.removeChild(list.lastChild);
  
  triggerAlert(newFeed, time);
  
  renderMarkers(24);
  buildZoneList();
  updateTopStats();
};

/* ─── CLOCK ────────────────────────────────────────────── */
function tick() {
  const n = new Date();
  const el = document.getElementById('clock');
  if (el) el.textContent = n.toLocaleTimeString('en-GB', {hour12: false});
}
setInterval(tick, 1000);
tick();

/* ─── COUNTER ANIMATION ───────────────────────────────── */
function animCount(elId, target, dur) {
  dur = dur || 900;
  const el = document.getElementById(elId);
  if (!el) return;
  let t0 = null;
  function step(ts) {
    if (!t0) t0 = ts;
    const p = Math.min((ts - t0) / dur, 1);
    el.textContent = Math.floor(p * target);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ─── TAB NAVIGATION ──────────────────────────────────── */
document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function(e) {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    e.target.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(function(c) { c.style.display = 'none'; });
    var tid = e.target.getAttribute('data-target');
    document.getElementById(tid).style.display = 'flex';
    if (tid === 'tab-map' && map) { setTimeout(function(){ map.invalidateSize(); }, 50); }
  });
});

/* ═══════════════════════════════════════════════════════════
   MAP (LEAFLET)
   ═══════════════════════════════════════════════════════════ */
function initMap() {
  map = L.map('leafletMap', {
    zoomControl: false,
    attributionControl: false
  }).setView([22.2925, 73.3639], 14);

  var layers = {
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'),
    street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')
  };

  // Default: Grid mode (no tiles)
  document.getElementById('leafletMap').classList.add('grid-mode');

  // Layer buttons
  document.getElementById('btn-grid').onclick = function(e) { switchLayer(e, null, layers); };
  document.getElementById('btn-dark').onclick = function(e) { switchLayer(e, layers.dark, layers); };
  document.getElementById('btn-street').onclick = function(e) { switchLayer(e, layers.street, layers); };
  document.getElementById('btn-satellite').onclick = function(e) { switchLayer(e, layers.satellite, layers); };

  // Render zone markers
  renderMarkers(24);

  // Time slider
  document.getElementById('timeSlider').addEventListener('input', function(e) {
    var val = parseInt(e.target.value);
    document.getElementById('ts-val').textContent = (val === 24) ? 'Live' : val + ':00';
    renderMarkers(val);
  });

  // Patrol route
  document.getElementById('btn-patrol').onclick = drawPatrolRoute;
}

function switchLayer(e, targetLayer, allLayers) {
  document.querySelectorAll('.map-btn').forEach(function(b) { b.classList.remove('active'); });
  e.target.classList.add('active');

  // Remove all tile layers
  Object.keys(allLayers).forEach(function(key) { map.removeLayer(allLayers[key]); });

  var container = document.getElementById('leafletMap');
  if (!targetLayer) {
    container.classList.add('grid-mode');
  } else {
    container.classList.remove('grid-mode');
    targetLayer.addTo(map);
  }
}

function renderMarkers(hour) {
  markers.forEach(function(m) { map.removeLayer(m); });
  markers = [];

  ZONES.forEach(function(z) {
    var baseSize = (z.risk === 'High') ? 22 : (z.risk === 'Medium') ? 16 : 11;
    var size = baseSize;

    if (hour < 24) {
      var factor = 0.4 + Math.sin((hour / 24) * Math.PI) * 0.6;
      size = Math.max(6, Math.round(baseSize * factor));
    }

    var ringSize = size * 4;
    var halfRing = ringSize / 2;

    var html = '<div style="position:relative;width:' + ringSize + 'px;height:' + ringSize + 'px;">'
      // Outer ring
      + '<div class="radar-outer" style="border:1px solid ' + z.color + ';"></div>'
      // Mid ring
      + '<div class="radar-mid" style="border:1px solid ' + z.color + ';"></div>'
      // Animated ping
      + '<div class="radar-ping" style="border:1.5px solid ' + z.color + ';"></div>'
      // Core dot
      + '<div class="radar-core" style="width:' + size + 'px;height:' + size + 'px;background:' + z.color + ';box-shadow:0 0 12px ' + z.color + ';"></div>'
      // Label
      + '<div class="radar-label" style="bottom:' + (halfRing + size/2 + 8) + 'px;">' + z.name + '</div>'
      + '</div>';

    var icon = L.divIcon({
      html: html,
      className: '',
      iconSize: [ringSize, ringSize],
      iconAnchor: [halfRing, halfRing]
    });

    var marker = L.marker([z.lat, z.lon], {icon: icon}).addTo(map);
    marker.on('click', (function(zone) {
      return function() { openDrillDown(zone); };
    })(z));

    markers.push(marker);
  });
}

/* ─── DRILL DOWN ───────────────────────────────────────── */
function openDrillDown(z) {
  window.currentDrillDownZoneName = z.name;
  document.getElementById('mapDefaultCard').style.display = 'none';
  var panel = document.getElementById('drillDownPanel');
  panel.style.display = 'block';

  document.getElementById('dd-title').textContent = z.name;
  var badge = document.getElementById('dd-risk');
  badge.textContent = z.risk;
  badge.style.color = z.color;
  badge.style.backgroundColor = z.color + '22';
  badge.style.border = '1px solid ' + z.color + '55';
  document.getElementById('dd-inc').textContent = z.incidents;
  document.getElementById('dd-conf').textContent = Math.round(z.conf * 100) + '%';

  // Populate recent
  var recent = document.getElementById('dd-recent');
  var items = FEED_POOL.filter(function(f) { return f.zone === z.name; }).slice(0, 3);
  if (items.length === 0) items = FEED_POOL.slice(0, 3);
  recent.innerHTML = items.map(function(f) {
    return '<div class="feed-item">'
      + '<div class="feed-dot" style="background:' + f.color + ';box-shadow:0 0 4px ' + f.color + '"></div>'
      + '<div class="feed-text"><div class="feed-type">' + f.type + '</div><div class="feed-zone">' + f.zone + '</div></div>'
      + '<div class="feed-time">Just now</div></div>';
  }).join('');
}

window.closeDrillDown = function() {
  document.getElementById('drillDownPanel').style.display = 'none';
  document.getElementById('mapDefaultCard').style.display = 'block';
  window.currentDrillDownZoneName = null;
};

window.removeCurrentPlace = function() {
  if (!window.currentDrillDownZoneName) return;
  
  var targetName = window.currentDrillDownZoneName;
  
  // Find index and splice from ZONES and window.zones
  var idx = ZONES.findIndex(function(z) { return z.name === targetName; });
  if (idx !== -1) {
    ZONES.splice(idx, 1);
  }
  window.zones = ZONES;
  
  localStorage.setItem("trinetra_custom_zones", JSON.stringify(ZONES));
  localStorage.setItem("trinetra_zones_updated", Date.now());
  
  // POST updated zones to bridge
  postStateToBridge({ zones: ZONES });
  
  closeDrillDown();
  renderMarkers(24);
  buildZoneList();
  updateTopStats();
  
  // Remove the zone from the Alerts tab if it has any active alerts inside the table DOM
  var tbody = document.getElementById('alertLogBody');
  if (tbody) {
    var rows = Array.from(tbody.querySelectorAll('tr'));
    rows.forEach(function(tr) {
      var tds = tr.querySelectorAll('td');
      if (tds.length >= 2 && tds[1].textContent.trim().toLowerCase() === targetName.toLowerCase()) {
        tr.remove();
      }
    });
  }
  
  // Appends a system log
  if(tbody) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="font-family:\'JetBrains Mono\';font-size:0.75rem;">' + new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) + '</td><td>' + targetName + '</td><td style="color:var(--high);">Zone Removed</td><td><span class="z-badge" style="color:var(--high);background:var(--highBg);">System</span></td>';
    tbody.insertBefore(tr, tbody.firstChild);
  }
  
  // Confirmation toast
  showToast('🗑️', 'Zone Removed', 'Zone ' + targetName + ' removed successfully', '#ff3860');
};


/* ─── PATROL ROUTE ─────────────────────────────────────── */
function drawPatrolRoute() {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  var highZones = ZONES.filter(function(z) { return z.risk === 'High' || z.risk === 'Medium'; });
  if (highZones.length < 2) return;

  var latlngs = highZones.map(function(z) { return [z.lat, z.lon]; });
  // Close the loop
  latlngs.push(latlngs[0]);

  routeLayer = L.polyline(latlngs, {
    color: '#7c6ff7',
    dashArray: '8, 12',
    weight: 2,
    opacity: 0.7
  }).addTo(map);

  map.fitBounds(routeLayer.getBounds(), {padding: [60, 60]});
}

/* ═══════════════════════════════════════════════════════════
   ANALYTICS (CHART.JS)
   ═══════════════════════════════════════════════════════════ */
function initCharts() {
  // --- LSTM Forecast Line Chart ---
  var ctxF = document.getElementById('forecastChart').getContext('2d');
  new Chart(ctxF, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Predicted Incidents',
        data: [120, 135, 125, 145, 180, 210, 195],
        borderColor: '#7c6ff7',
        backgroundColor: 'rgba(124,111,247,0.08)',
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#7c6ff7',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(37,40,64,0.6)' }, ticks: { color: '#5a5f7a', font: { size: 11 } } },
        x: { grid: { display: false }, ticks: { color: '#5a5f7a', font: { size: 11 } } }
      }
    }
  });

  // --- Donut Chart ---
  var high = ZONES.filter(function(z) { return z.risk === 'High'; }).length;
  var med  = ZONES.filter(function(z) { return z.risk === 'Medium'; }).length;
  var low  = ZONES.filter(function(z) { return z.risk === 'Low'; }).length;
  var total = ZONES.length;
  document.getElementById('donutTotal').textContent = total;

  var ctxD = document.getElementById('donutChart').getContext('2d');
  new Chart(ctxD, {
    type: 'doughnut',
    data: {
      labels: ['High', 'Medium', 'Low'],
      datasets: [{
        data: [high, med, low],
        backgroundColor: ['#ff3860', '#ffb347', '#00e676'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: { legend: { display: false } }
    }
  });

  // Donut legend
  var legendData = [
    {l: 'High Risk',   v: high, c: '#ff3860'},
    {l: 'Medium Risk', v: med,  c: '#ffb347'},
    {l: 'Low Risk',    v: low,  c: '#00e676'}
  ];
  document.getElementById('donutLegend').innerHTML = legendData.map(function(d) {
    return '<div class="dl-row"><div class="dl-dot" style="background:' + d.c + '"></div>'
      + '<span>' + d.l + '</span><span class="dl-pct">' + d.v + '</span></div>';
  }).join('');

  // --- Bar Chart ---
  var ctxB = document.getElementById('barChart').getContext('2d');
  new Chart(ctxB, {
    type: 'bar',
    data: {
      labels: ['Theft', 'Assault', 'Burglary', 'Vehicle', 'Drug', 'Vandalism', 'Fraud'],
      datasets: [{
        label: 'Incidents',
        data: [85, 62, 45, 38, 25, 20, 15],
        backgroundColor: [
          'rgba(255,56,96,0.75)', 'rgba(255,56,96,0.6)',
          'rgba(255,179,71,0.75)', 'rgba(255,179,71,0.6)',
          'rgba(0,230,118,0.6)', 'rgba(0,230,118,0.5)',
          'rgba(124,111,247,0.6)'
        ],
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(37,40,64,0.6)' }, ticks: { color: '#5a5f7a', font: { size: 11 } } },
        x: { grid: { display: false }, ticks: { color: '#5a5f7a', font: { size: 11 } } }
      }
    }
  });
}

/* ─── ZONE LIST ────────────────────────────────────────── */
function buildZoneList() {
  var list = document.getElementById('zoneList');
  // Generate stable sparkline data
  var sparkData = ZONES.map(function() {
    var pts = [];
    for (var i = 0; i < 6; i++) pts.push(5 + Math.random() * 12);
    return pts;
  });

  list.innerHTML = ZONES.map(function(z, idx) {
    var pts = sparkData[idx];
    var path = pts.map(function(v, i) { return (i === 0 ? 'M' : 'L') + (i * 10) + ',' + (18 - v); }).join(' ');
    return '<div class="zone-row">'
      + '<div class="z-dot" style="background:' + z.color + ';box-shadow:0 0 6px ' + z.color + '"></div>'
      + '<div class="z-name">' + z.name + '</div>'
      + '<svg class="sparkline" viewBox="0 0 50 20"><path d="' + path + '" fill="none" stroke="' + z.color + '" stroke-width="1.5"/></svg>'
      + '<div class="z-badge" style="color:' + z.color + ';background:' + z.color + '22;border:1px solid ' + z.color + '44;">' + z.risk + '</div>'
      + '</div>';
  }).join('');
}

/* ─── FILTERS ──────────────────────────────────────────── */
function buildFilters() {
  document.getElementById('filterChips').innerHTML = CRIME_TYPES.map(function(t) {
    var cls = (t === activeFilter) ? 'chip active' : 'chip';
    return '<div class="' + cls + '" onclick="activeFilter=\'' + t + '\';buildFilters()">' + t + '</div>';
  }).join('');
}

/* ═══════════════════════════════════════════════════════════
   ALERTS & LIVE FEED
   ═══════════════════════════════════════════════════════════ */
var countdown = 60;
setInterval(function() {
  countdown--;
  if (countdown <= 0) countdown = 60;
  var el = document.getElementById('refreshCountdown');
  if (el) el.textContent = countdown + 's';
}, 1000);

function addFeedItem() {
  var f = FEED_POOL[Math.floor(Math.random() * FEED_POOL.length)];
  var now = new Date();
  var time = now.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});

  var list = document.getElementById('feedList');
  if (!list) return;

  var div = document.createElement('div');
  div.className = 'feed-item';
  div.innerHTML = '<div class="feed-dot" style="background:' + f.color + ';box-shadow:0 0 4px ' + f.color + '"></div>'
    + '<div class="feed-text"><div class="feed-type">' + f.type + '</div><div class="feed-zone">' + f.zone + '</div></div>'
    + '<div class="feed-time">' + time + '</div>';

  list.insertBefore(div, list.firstChild);
  if (list.children.length > 8) list.removeChild(list.lastChild);

  // Alert on high risk
  if (f.risk === 'High') triggerAlert(f, time);
}

function triggerAlert(f, time) {
  var tbody = document.getElementById('alertLogBody');
  if (!tbody) return;

  var tr = document.createElement('tr');
  tr.innerHTML = '<td style="font-family:\'JetBrains Mono\',monospace;font-size:0.75rem;">' + time + '</td>'
    + '<td>' + f.zone + '</td>'
    + '<td style="color:' + f.color + ';font-weight:600;">' + f.type + ' Spike</td>'
    + '<td><span class="z-badge" style="color:#00e676;background:rgba(0,230,118,0.15);border:1px solid rgba(0,230,118,0.3);">Logged</span></td>';

  tbody.insertBefore(tr, tbody.firstChild);
  if (tbody.children.length > 20) tbody.removeChild(tbody.lastChild);

  // Browser notification
  var toggle = document.getElementById('pushToggle');
  if (toggle && toggle.checked && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('TRINETRA AI Alert', { body: 'High risk spike in ' + f.zone + ' (' + f.type + ')' });
  }
}

// Push notification permission
var pushToggle = document.getElementById('pushToggle');
if (pushToggle) {
  pushToggle.addEventListener('change', function(e) {
    if (e.target.checked && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   NLP ANALYZER
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   NLP ANALYZER
   ═══════════════════════════════════════════════════════════ */
async function analyzeWithGemini(reportsText) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=AIzaSyDR98OdtYEHb4XXMgkTp0mEhFbZcX2agbQ`;
  
  const prompt = `You are a police report classification assistant. Analyze the following police report text:\n\n"""\n${reportsText}\n"""\n\nReturn a JSON array of objects (one object per paragraph/report, if there are multiple separated by double line breaks). Each object must contain EXACTLY the following JSON keys:\n{\n  "crime": "Robbery" | "Assault" | "Theft" | "Burglary" | "Drug Offense" | "Vandalism" | "Unknown",\n  "icd": "Suitable ICD-10 external cause code like X52, X93, W32, etc.",\n  "sentiment": "Fearful" | "Negative" | "Calm" | "Concerned" | "Urgent",\n  "severity": "High" | "Medium" | "Low",\n  "preview": "Short summary of the text (max 100 characters)"\n}\nReturn ONLY a valid JSON array of objects. Do NOT wrap in markdown block (like \`\`\`json). No explanation, just the raw JSON.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });
  
  if (!response.ok) {
    throw new Error('Gemini HTTP error: ' + response.status);
  }
  
  const data = await response.json();
  const resText = data.candidates[0].content.parts[0].text.trim();
  let cleanJson = resText;
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  }
  return JSON.parse(cleanJson);
}

var btnAnalyze = document.getElementById('btn-analyze');
if (btnAnalyze) {
  btnAnalyze.onclick = async function() {
    var text = document.getElementById('nlpInput').value;
    if (!text.trim()) return;

    var reports = text.split('\n\n').filter(function(t) { return t.trim().length > 0; });
    var resultsDiv = document.getElementById('nlpResults');
    resultsDiv.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:0.82rem;margin-top:50px;"><span class="live-dot" style="display:inline-block;margin-right:8px;background:var(--accent);"></span>Analyzing with Gemini AI NLP...</div>';

    try {
      const geminiResults = await analyzeWithGemini(text);
      resultsDiv.innerHTML = '';
      geminiResults.forEach(function(res, i) {
        var crime = res.crime || 'Unknown';
        var icd = res.icd || 'R99';
        var sentiment = res.sentiment || 'Calm';
        var sev = res.severity || 'Low';
        var preview = res.preview || '';
        
        var sentClass = (sentiment === 'Calm') ? 'sent-pos' : 'sent-neg';
        
        resultsDiv.innerHTML += '<div class="nlp-res-card" style="margin-bottom:12px;">'
          + '<div style="font-size:0.68rem;color:var(--muted);margin-bottom:8px;letter-spacing:0.05em;">REPORT ' + (i + 1) + '</div>'
          + '<div style="font-size:0.82rem;margin-bottom:14px;line-height:1.5;color:var(--text);opacity:0.85;">"' + preview + '"</div>'
          + '<div>'
          + '<span class="nlp-tag crime">' + crime + ' (ICD: ' + icd + ')</span>'
          + '<span class="nlp-tag ' + sentClass + '">Sentiment: ' + sentiment + '</span>'
          + '<span class="nlp-tag">Severity: ' + sev + '</span>'
          + '</div></div>';
      });
    } catch(err) {
      console.error("Gemini API error, falling back to heuristics:", err);
      resultsDiv.innerHTML = '';
      reports.forEach(function(rep, i) {
        var ltext = rep.toLowerCase();

        var crime = 'Unknown', sev = 'Low', icd = 'R99';
        if (ltext.indexOf('robbery') >= 0 || ltext.indexOf('gunpoint') >= 0 || ltext.indexOf('mugged') >= 0) {
          crime = 'Robbery'; sev = 'High'; icd = 'X52';
        } else if (ltext.indexOf('assault') >= 0 || ltext.indexOf('attacked') >= 0 || ltext.indexOf('stabbed') >= 0) {
          crime = 'Assault'; sev = 'High'; icd = 'X93';
        } else if (ltext.indexOf('theft') >= 0 || ltext.indexOf('stolen') >= 0 || ltext.indexOf('shoplifting') >= 0) {
          crime = 'Theft'; sev = 'Medium'; icd = 'W32';
        } else if (ltext.indexOf('burglary') >= 0 || ltext.indexOf('forced entry') >= 0 || ltext.indexOf('broke in') >= 0) {
          crime = 'Burglary'; sev = 'Medium'; icd = 'W20';
        } else if (ltext.indexOf('drug') >= 0 || ltext.indexOf('narcotics') >= 0 || ltext.indexOf('marijuana') >= 0) {
          crime = 'Drug Offense'; sev = 'Low'; icd = 'F19';
        } else if (ltext.indexOf('vandalism') >= 0 || ltext.indexOf('graffiti') >= 0) {
          crime = 'Vandalism'; sev = 'Low'; icd = 'V01';
        }

        var negWords = ['gun', 'fled', 'stolen', 'stabbed', 'attacked', 'shot', 'dead', 'weapon', 'threatened'];
        var negCount = negWords.filter(function(w) { return ltext.indexOf(w) >= 0; }).length;
        var sentiment = negCount >= 2 ? 'Fearful' : negCount >= 1 ? 'Negative' : 'Calm';
        var sentClass = (sentiment === 'Calm') ? 'sent-pos' : 'sent-neg';

        var preview = rep.length > 100 ? rep.substring(0, 100) + '...' : rep;

        resultsDiv.innerHTML += '<div class="nlp-res-card" style="margin-bottom:12px;">'
          + '<div style="font-size:0.68rem;color:var(--muted);margin-bottom:8px;letter-spacing:0.05em;">REPORT ' + (i + 1) + '</div>'
          + '<div style="font-size:0.82rem;margin-bottom:14px;line-height:1.5;color:var(--text);opacity:0.85;">"' + preview + '"</div>'
          + '<div>'
          + '<span class="nlp-tag crime">' + crime + ' (ICD: ' + icd + ')</span>'
          + '<span class="nlp-tag ' + sentClass + '">Sentiment: ' + sentiment + '</span>'
          + '<span class="nlp-tag">Severity: ' + sev + '</span>'
          + '</div></div>';
      });
    }
  };
}

/* ═══════════════════════════════════════════════════════════
   THEME & EXPORT
   ═══════════════════════════════════════════════════════════ */
var themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
  themeBtn.onclick = function() {
    var root = document.documentElement;
    var isLight = root.getAttribute('data-theme') === 'light';
    root.setAttribute('data-theme', isLight ? '' : 'light');
    themeBtn.textContent = isLight ? '\u{1F319}' : '\u{2600}\u{FE0F}';
  };
}

var pdfBtn = document.getElementById('pdfExport');
if (pdfBtn) {
  pdfBtn.onclick = function() {
    var activeTab = document.querySelector('.tab.active');
    var isMap = activeTab && activeTab.getAttribute('data-target') === 'tab-map';
    var originalTitle = document.title;
    if (isMap) document.title = 'mappdf';
    window.print();
    if (isMap) document.title = originalTitle;
  };
}

function updateTopStats() {
  var total = ZONES.reduce(function(s, z) { return s + z.incidents; }, 0);
  var highCount = ZONES.filter(function(z) { return z.risk === 'High'; }).length;
  var medCount  = ZONES.filter(function(z) { return z.risk === 'Medium'; }).length;
  var lowCount  = ZONES.filter(function(z) { return z.risk === 'Low'; }).length;

  animCount('tb-total', total, 400);
  animCount('tb-high', highCount, 400);
  animCount('tb-med', medCount, 400);
  animCount('tb-low', lowCount, 400);
  animCount('ov-total', total, 400);
  animCount('ov-high', highCount, 400);
  animCount('ov-med', medCount, 400);
}

/* ═══════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════ */
window.onload = function() {
  if (window.LOGO_B64) {
    document.getElementById('trinetraLogo').src = window.LOGO_B64;
  }

  // Load state from bridge on startup
  syncWithBridgeOnBoot();

  initMap();
  initCharts();
  buildZoneList();
  buildFilters();
  updateTopStats();

  // Start live feed
  addFeedItem();
  addFeedItem();
  addFeedItem();
  setInterval(addFeedItem, 4000);

  // Boot new features
  initNotificationSystem();
  initScanMode();
  populateWizardZones();

  // Close notification drawer on outside click
  document.addEventListener('click', function(e) {
    var wrap = document.getElementById('notifBellWrap');
    if (wrap && !wrap.contains(e.target)) {
      var drawer = document.getElementById('notifDrawer');
      if (drawer) drawer.style.display = 'none';
    }
  });
};

/* ═══════════════════════════════════════════════════════════
   FEATURE 3 — NOTIFICATION BELL & HISTORY LOG
   ═══════════════════════════════════════════════════════════ */
var NOTIFICATIONS = [];
var notifUnread = 0;

function initNotificationSystem() {
  addNotification('🔵', '#7c6ff7', 'System Online', 'TRINETRA AI monitoring active across all Parul Univ zones.', true);
  addNotification('🟠', '#ffb347', 'Anomaly Detected', 'Unusual activity pattern in Limda Village after midnight.', true);

  // Mock alerts every 28 seconds
  var mockPool = [
    {icon:'🔴', color:'#ff3860', title:'Crime Spike', sub:'Robbery reported near Limda bus stop. Unit dispatched.'},
    {icon:'🟠', color:'#ffb347', title:'Anomaly Alert', sub:'Vehicle crowd forming near Waghodia Crossing.'},
    {icon:'🔵', color:'#7c6ff7', title:'Patrol Scan', sub:'1km scan completed — Parul Campus Central clear.'},
    {icon:'🟢', color:'#00e676', title:'Zone Update', sub:'Amrapali Township risk level dropped to Low.'},
    {icon:'🔴', color:'#ff3860', title:'Incident Report', sub:'Assault reported near Mastana Chowk food court. Alert raised.'},
    {icon:'🟠', color:'#ffb347', title:'System Warning', sub:'Unusual login attempt on police data terminal detected.'},
  ];
  var mockIdx = 0;
  setInterval(function() {
    var m = mockPool[mockIdx % mockPool.length];
    addNotification(m.icon, m.color, m.title, m.sub, false);
    mockIdx++;
  }, 28000);
}

function addNotification(icon, color, title, sub, silent) {
  var now = new Date();
  var timeStr = now.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
  NOTIFICATIONS.unshift({icon:icon, color:color, title:title, sub:sub, time:timeStr});
  if (!silent) {
    notifUnread++;
    updateBellBadge();
    showToast(icon, title, sub, color);
  }
  renderNotifList();
}

function updateBellBadge() {
  var badge = document.getElementById('notifBadge');
  if (!badge) return;
  if (notifUnread > 0) {
    badge.style.display = 'block';
    badge.textContent = notifUnread > 9 ? '9+' : String(notifUnread);
    badge.style.animation = 'none';
    void badge.offsetWidth;
    badge.style.animation = 'pop 0.3s cubic-bezier(0.1,0.8,0.3,1)';
  } else {
    badge.style.display = 'none';
  }
}

function renderNotifList() {
  var list = document.getElementById('notifList');
  if (!list) return;
  if (NOTIFICATIONS.length === 0) {
    list.innerHTML = '<div class="notif-empty">No alerts yet. System monitoring active.</div>';
    return;
  }
  list.innerHTML = NOTIFICATIONS.slice(0, 20).map(function(n) {
    return '<div class="notif-item">'
      + '<div class="notif-dot" style="background:' + n.color + ';box-shadow:0 0 6px ' + n.color + ';"></div>'
      + '<div class="notif-body">'
      + '<div class="notif-title">' + n.title + '</div>'
      + '<div class="notif-sub">' + n.sub + '</div>'
      + '</div>'
      + '<div class="notif-time">' + n.time + '</div>'
      + '</div>';
  }).join('');
}

window.toggleNotifDrawer = function() {
  var drawer = document.getElementById('notifDrawer');
  if (!drawer) return;
  var isOpen = drawer.style.display !== 'none';
  drawer.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) { notifUnread = 0; updateBellBadge(); }
};

window.clearAllNotifs = function() {
  NOTIFICATIONS = [];
  notifUnread = 0;
  updateBellBadge();
  renderNotifList();
};

/* ── TOAST ───────────────────────────────────────────────── */
function showToast(icon, title, msg, color) {
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var el = document.createElement('div');
  el.className = 'toast-item';
  el.style.borderLeft = '3px solid ' + color;
  el.innerHTML = '<div class="toast-icon">' + icon + '</div>'
    + '<div class="toast-body">'
    + '<div class="toast-title">' + title + '</div>'
    + '<div class="toast-msg">' + msg + '</div>'
    + '</div>';
  el.onclick = function() { removeToast(el); };
  container.appendChild(el);
  setTimeout(function() { removeToast(el); }, 5000);
}

function removeToast(el) {
  if (!el || !el.parentNode) return;
  el.style.animation = 'toast-out 0.3s ease forwards';
  setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
}

/* ═══════════════════════════════════════════════════════════
   FEATURE 2 — 1KM RADIUS SCAN MODE
   ═══════════════════════════════════════════════════════════ */
var scanMode = false;
var scanCircle = null;

function initScanMode() {
  var scanBtn = document.getElementById('btn-scan');
  if (!scanBtn) return;
  scanBtn.onclick = function() {
    scanMode = !scanMode;
    scanBtn.classList.toggle('active', scanMode);
    scanBtn.textContent = scanMode ? '📡 Scanning...' : '📡 Scan';
    if (scanMode) {
      showToast('📡', 'Scan Mode Active', 'Click anywhere on the map to scan a 1km radius.', '#7c6ff7');
    } else {
      clearScanCircle();
    }
  };
  // Hook map click — wait for map init
  setTimeout(function() {
    if (map) {
      map.on('click', function(e) {
        if (scanMode) runScan(e.latlng);
      });
    }
  }, 500);
}

function clearScanCircle() {
  if (scanCircle && map) { map.removeLayer(scanCircle); scanCircle = null; }
  var card = document.getElementById('scanResultCard');
  if (card) card.style.display = 'none';
}

window.closeScanCard = function() { clearScanCircle(); };

function haversineKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2)*Math.sin(dLat/2)
    + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function runScan(latlng) {
  if (scanCircle) map.removeLayer(scanCircle);
  scanCircle = L.circle([latlng.lat, latlng.lng], {
    radius: 1000, color: '#7c6ff7', fillColor: '#7c6ff7',
    fillOpacity: 0.07, weight: 2, dashArray: '6 4'
  }).addTo(map);

  var inside = ZONES.filter(function(z) {
    return haversineKm(latlng.lat, latlng.lng, z.lat, z.lon) <= 1.0;
  });
  var highInside = inside.filter(function(z) { return z.risk === 'High'; });

  var content = '';
  if (inside.length === 0) {
    content = '<div style="color:var(--low);font-size:0.72rem;font-weight:600;">✅ No active zones within 1km. Area appears clear.</div>';
  } else {
    content = inside.map(function(z) {
      return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border2);font-size:0.7rem;">'
        + '<span style="color:var(--text);font-weight:600;">' + z.name + '</span>'
        + '<span style="color:' + z.color + ';font-weight:700;">' + z.risk.toUpperCase() + '</span>'
        + '</div>';
    }).join('');
    if (highInside.length > 0) {
      content += '<div style="margin-top:8px;padding:6px 8px;background:var(--highBg);border:1px solid rgba(255,56,96,0.3);border-radius:5px;font-size:0.67rem;color:var(--high);font-weight:600;">⚠️ HIGH RISK zones detected within range!</div>';
    }
  }
  document.getElementById('scanResultContent').innerHTML = content;
  document.getElementById('scanResultCard').style.display = 'block';

  var summary = inside.length > 0
    ? '1km scan: ' + inside.length + ' zone(s) found near [' + latlng.lat.toFixed(3) + ',' + latlng.lng.toFixed(3) + '].'
    : '1km scan complete — area clear.';
  addNotification('🔵', '#7c6ff7', 'Radius Scan Complete', summary, false);
}

/* ═══════════════════════════════════════════════════════════
   FEATURE 1 — 3-STEP CRIME WIZARD
   ═══════════════════════════════════════════════════════════ */
var wzRisk = 'High';

function populateWizardZones() {
  var sel = document.getElementById('wz-zone');
  if (!sel) return;
  sel.innerHTML = ZONES.map(function(z) {
    return '<option value="' + z.name + '">' + z.name + ' (' + z.risk + ' Risk)</option>';
  }).join('');
}

window.openCrimeWizard = function() {
  populateWizardZones();
  wzRisk = 'High';
  document.querySelectorAll('.wz-risk-btn').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-risk') === 'High');
  });
  wizardGoToStep(1);
  var d = document.getElementById('wz-desc');
  if (d) d.value = '';
  document.getElementById('crimeWizardModal').style.display = 'flex';
};

window.setWzRisk = function(btn) {
  wzRisk = btn.getAttribute('data-risk');
  document.querySelectorAll('.wz-risk-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
};

window.wizardNext = function(fromStep) {
  if (fromStep === 1) {
    var desc = document.getElementById('wz-desc').value.trim();
    if (!desc) { showToast('⚠️', 'Field Required', 'Please enter an incident description before continuing.', '#ffb347'); return; }
    wizardGoToStep(2);
    runWizardScan();
  } else if (fromStep === 2) {
    buildEmailPreview();
    wizardGoToStep(3);
  }
};

window.wizardBack = function() { wizardGoToStep(1); };

window.wizardGoToStep = function(step) {
  [1,2,3].forEach(function(s) {
    var el = document.getElementById('wizardStep' + s);
    if (el) el.style.display = (s === step) ? 'block' : 'none';
    var ws = document.getElementById('ws' + s);
    if (ws) {
      ws.classList.toggle('active', s === step);
      ws.classList.toggle('done', s < step);
    }
  });
  [1,2].forEach(function(l) {
    var ln = document.getElementById('wsline' + l);
    if (ln) ln.classList.toggle('done', l < step);
  });
};

function runWizardScan() {
  var zoneName = document.getElementById('wz-zone').value;
  var zone = ZONES.find(function(z) { return z.name === zoneName; });
  var resDiv = document.getElementById('wizardScanResults');
  if (!zone || !resDiv) return;
  resDiv.innerHTML = '<span style="color:var(--muted);">📡 Scanning 1km radius from ' + zoneName + '...</span>';
  setTimeout(function() {
    var nearby = ZONES.filter(function(z) {
      return z.name !== zone.name && haversineKm(zone.lat, zone.lon, z.lat, z.lon) <= 1.0;
    });
    var highNearby = nearby.filter(function(z) { return z.risk === 'High'; });
    var html = '';
    if (nearby.length === 0) {
      html = '<span style="color:var(--low);font-weight:600;">✅ No other zones within 1km. Isolated incident.</span>';
    } else {
      html = nearby.map(function(z) {
        return '<div style="display:flex;justify-content:space-between;font-size:0.7rem;padding:3px 0;border-bottom:1px solid var(--border2);">'
          + '<span style="color:var(--text);">' + z.name + '</span>'
          + '<span style="color:' + z.color + ';font-weight:700;">' + z.risk + '</span>'
          + '</div>';
      }).join('');
      if (highNearby.length > 0) {
        html += '<div style="margin-top:6px;padding:5px 8px;background:var(--highBg);border:1px solid rgba(255,56,96,0.3);border-radius:5px;font-size:0.67rem;color:var(--high);font-weight:600;">⚠️ HIGH RISK zones nearby — escalate priority!</div>';
      }
    }
    resDiv.innerHTML = html;
  }, 900);
}

function buildEmailPreview() {
  var category = document.getElementById('wz-category').value;
  var zone     = document.getElementById('wz-zone').value;
  var desc     = document.getElementById('wz-desc').value;
  var emailTo  = document.getElementById('wz-email-addr').value || 'dispatch@trinetra.gov.in';
  var now      = new Date().toLocaleString('en-GB');
  var riskColor = wzRisk === 'High' ? 'var(--high)' : wzRisk === 'Medium' ? 'var(--med)' : 'var(--low)';

  document.getElementById('emailPreview').innerHTML =
    '<div class="ep-header">'
    + '<div class="ep-row"><span>From:</span><span>noreply@trinetra.ai</span></div>'
    + '<div class="ep-row"><span>To:</span><span>' + emailTo + '</span></div>'
    + '<div class="ep-row"><span>Subject:</span><span style="color:var(--high);font-weight:700;">[TRINETRA] ' + wzRisk.toUpperCase() + ' RISK — ' + category + ' · ' + zone + '</span></div>'
    + '<div class="ep-row"><span>Sent:</span><span>' + now + '</span></div>'
    + '</div>'
    + '<div class="ep-body">'
    + '<strong>TRINETRA AI Crime Dispatch System</strong><br><br>'
    + 'A <strong style="color:' + riskColor + '">' + wzRisk + ' Risk</strong> incident has been logged and requires immediate attention.<br><br>'
    + '<strong>Category:</strong> ' + category + '<br>'
    + '<strong>Zone:</strong> ' + zone + '<br><br>'
    + '<strong>Description:</strong><br>"' + desc + '"<br><br>'
    + '<em style="color:var(--muted);">This is an automated dispatch from TRINETRA AI. Please respond immediately.</em>'
    + '</div>';
}

window.dispatchCrimeAlert = function() {
  var category   = document.getElementById('wz-category').value;
  var zone       = document.getElementById('wz-zone').value;
  var desc       = document.getElementById('wz-desc').value;
  var sendPush   = document.getElementById('wz-push').checked;
  var sendCitizen= document.getElementById('wz-citizen').checked;

  closeModal('crimeWizardModal');

  // Bell notification
  addNotification('🔴', '#ff3860', 'Crime Dispatched: ' + category, zone + ' — ' + wzRisk + ' Risk. All channels notified.', false);

  // Toast confirmations
  showToast('🚨', 'Alert Dispatched!', category + ' in ' + zone + '. Channels notified.', '#ff3860');
  showToast('🟢', 'Email Sent', 'Dispatch email sent via SendGrid to officer inbox.', '#00e676');

  // Update alerts tab table
  var tbody = document.getElementById('alertLogBody');
  if (tbody) {
    var rColor = wzRisk === 'High' ? '#ff3860' : wzRisk === 'Medium' ? '#ffb347' : '#00e676';
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="font-family:\'JetBrains Mono\';font-size:0.75rem;">'
      + new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) + '</td>'
      + '<td>' + zone + '</td>'
      + '<td style="color:' + rColor + ';font-weight:600;">' + category + ' — ' + wzRisk + '</td>'
      + '<td><span class="z-badge" style="color:#ff3860;background:var(--highBg);border:1px solid rgba(255,56,96,0.3);">Dispatched</span></td>';
    tbody.insertBefore(tr, tbody.firstChild);
  }

  // Browser Push Notification
  if (sendPush && typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      new Notification('🚨 TRINETRA DISPATCH', {body: wzRisk + ' Risk: ' + category + ' in ' + zone});
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(function(p) {
        if (p === 'granted') new Notification('🚨 TRINETRA DISPATCH', {body: wzRisk + ' Risk: ' + category + ' in ' + zone});
      });
    }
  }

  // Cross-dashboard broadcast → Citizen Portal via HTML5 localStorage storage event
  if (sendCitizen) {
    var broadcastPayload = {
      type: category, zone: zone, risk: wzRisk, desc: desc,
      timestamp: new Date().toISOString(), id: Date.now()
    };
    localStorage.setItem('trinetra_admin_broadcast', JSON.stringify(broadcastPayload));
    
    // Also push to bridge notifications
    var targetZ = ZONES.find(function(z) { return z.name === zone; });
    var zLat = targetZ ? targetZ.lat : 22.2925;
    var zLon = targetZ ? targetZ.lon : 73.3639;
    var notifPayload = {
      id: 'notif_' + Date.now(),
      type: 'zone_alert',
      zone: zone,
      alertType: category,
      severity: wzRisk,
      message: desc,
      radius: '2km',
      lat: zLat,
      lon: zLon,
      timestamp: new Date().toISOString(),
      read: false
    };
    var existing = JSON.parse(localStorage.getItem('trinetra_user_notifications') || '[]');
    existing.unshift(notifPayload);
    localStorage.setItem('trinetra_user_notifications', JSON.stringify(existing));
    localStorage.setItem('trinetra_user_notif_updated', Date.now().toString());

    postStateToBridge({
      broadcasts: [broadcastPayload],
      notifications: existing
    });
  }
};

window.dispatchDrillDownAlert = function() {
  if (!window.currentDrillDownZoneName) return;
  var zone = ZONES.find(function(z) { return z.name === window.currentDrillDownZoneName; });
  if (!zone) return;

  var category = "Tactical Alert";
  var desc = "Emergency dispatch warning issued for proximity zone: " + zone.name + ". Remain alert, secure all premises, and avoid unnecessary travel.";
  var risk = zone.risk;

  // Bell notification in Admin
  addNotification('🔴', '#ff3860', 'Proximity Alert: ' + zone.name, 'Tactical alert broadcasted to 1km radius.', false);

  // Toast confirmations in Admin
  showToast('🚨', 'Proximity Alert Sent!', 'Broadcast dispatched to 1km radius of ' + zone.name, '#ff3860');
  showToast('🟢', 'Emergency Email Sent', 'Proximity alert email sent to registered users in 1km radius of ' + zone.name, '#00e676');

  // Update alert log table in Admin
  var tbody = document.getElementById('alertLogBody');
  if (tbody) {
    var rColor = zone.color || '#ffb347';
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="font-family:\'JetBrains Mono\';font-size:0.75rem;">'
      + new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) + '</td>'
      + '<td>' + zone.name + '</td>'
      + '<td style="color:' + rColor + ';font-weight:600;">Tactical Alert — ' + risk + '</td>'
      + '<td><span class="z-badge" style="color:#ff3860;background:var(--highBg);border:1px solid rgba(255,56,96,0.3);">1km Broadcast</span></td>';
    tbody.insertBefore(tr, tbody.firstChild);
  }

  // Cross-dashboard broadcast to Citizen Portal
  var broadcastPayload = {
    type: "Tactical Warning",
    zone: zone.name,
    risk: risk,
    desc: desc,
    lat: zone.lat,
    lon: zone.lon,
    timestamp: new Date().toISOString(),
    id: Date.now()
  };
  localStorage.setItem('trinetra_admin_broadcast', JSON.stringify(broadcastPayload));
  
  var notifPayload = {
    id: 'notif_' + Date.now(),
    type: 'zone_alert',
    zone: zone.name,
    alertType: 'Tactical Warning',
    severity: risk,
    message: desc,
    radius: '1km',
    lat: zone.lat,
    lon: zone.lon,
    timestamp: new Date().toISOString(),
    read: false
  };
  var existing = JSON.parse(localStorage.getItem('trinetra_user_notifications') || '[]');
  existing.unshift(notifPayload);
  localStorage.setItem('trinetra_user_notifications', JSON.stringify(existing));
  localStorage.setItem('trinetra_user_notif_updated', Date.now().toString());

  postStateToBridge({
    broadcasts: [broadcastPayload],
    notifications: existing
  });
};

/* ─── CROSS-DASHBOARD SYNC ENGINE VIA HTTP BRIDGE ─────── */
var adminLastPollHash = {
  zones: null,
  users: null,
  suggestions: null
};

function postStateToBridge(payload) {
  return fetch('http://localhost:8588/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function(r) { return r.json(); })
    .catch(function(e) { console.error('[TRINETRA BRIDGE] POST error:', e); });
}

window.syncWithBridgeOnBoot = function() {
  fetch('http://localhost:8588/api/state')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      console.log('[TRINETRA BRIDGE] Initial state loaded:', data);
      
      // 1. Sync zones
      if (data.zones && data.zones.length > 0) {
        ZONES = data.zones;
        window.zones = ZONES;
        localStorage.setItem("trinetra_custom_zones", JSON.stringify(ZONES));
        adminLastPollHash.zones = JSON.stringify(ZONES);
        if (map) renderMarkers(24);
        buildZoneList();
        updateTopStats();
      } else {
        // Seed bridge with local default zones
        fetch('http://localhost:8588/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zones: ZONES })
        }).catch(function(e) { console.error('[TRINETRA BRIDGE] Seeding error:', e); });
      }

      // 2. Sync active users
      if (data.users && data.users.length > 0) {
        localStorage.setItem('trinetra_users', JSON.stringify(data.users));
        adminLastPollHash.users = JSON.stringify(data.users);
      }
      
      // 3. Sync suggestions
      if (data.suggestions && data.suggestions.length > 0) {
        localStorage.setItem('trinetra_suggestions', JSON.stringify(data.suggestions));
        adminLastPollHash.suggestions = JSON.stringify(data.suggestions);
        if (typeof updateSuggestionsBadgeCount === 'function') updateSuggestionsBadgeCount();
        if (typeof renderSuggestionsList === 'function') renderSuggestionsList();
      }
    })
    .catch(function(err) {
      console.warn('[TRINETRA BRIDGE] Could not connect to bridge server on boot:', err.message);
    });
};

window.pollBridgeForAdmin = function() {
  fetch('http://localhost:8588/api/state')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      // 1. Check for remote zones update
      if (data.zones && data.zones.length > 0) {
        var zonesStr = JSON.stringify(data.zones);
        if (zonesStr !== adminLastPollHash.zones) {
          adminLastPollHash.zones = zonesStr;
          console.log('[TRINETRA BRIDGE] Zones update detected via poll');
          ZONES = data.zones;
          window.zones = ZONES;
          localStorage.setItem("trinetra_custom_zones", JSON.stringify(ZONES));
          if (map) renderMarkers(24);
          buildZoneList();
          updateTopStats();
        }
      }
      
      // 2. Check for active users update
      if (data.users) {
        var usersStr = JSON.stringify(data.users);
        if (usersStr !== adminLastPollHash.users) {
          adminLastPollHash.users = usersStr;
          console.log('[TRINETRA BRIDGE] Users database updated:', data.users.length);
          localStorage.setItem('trinetra_users', usersStr);
        }
      }
      
      // 3. Check for suggestions update
      if (data.suggestions) {
        var suggStr = JSON.stringify(data.suggestions);
        if (suggStr !== adminLastPollHash.suggestions) {
          adminLastPollHash.suggestions = suggStr;
          console.log('[TRINETRA BRIDGE] Suggestions updated:', data.suggestions.length);
          localStorage.setItem('trinetra_suggestions', suggStr);
          if (typeof updateSuggestionsBadgeCount === 'function') updateSuggestionsBadgeCount();
          if (typeof renderSuggestionsList === 'function') renderSuggestionsList();
        }
      }
    })
    .catch(function(err) {
      // Quiet fail
    });
};

// Start the admin polling cycle
setInterval(window.pollBridgeForAdmin, 2000);

/* ═══════════════════════════════════════════════════════════
   ZONE ALERT MODAL — FEATURE 1
   ═══════════════════════════════════════════════════════════ */
var zaAlertSeverity = 'Medium';

window.openZoneAlertModal = function() {
  if (!window.currentDrillDownZoneName) return;
  document.getElementById('za-zone-name').value = window.currentDrillDownZoneName;
  document.getElementById('za-message').value = '';
  document.getElementById('za-char-count').textContent = '(300 chars remaining)';
  zaAlertSeverity = 'Medium';
  document.querySelectorAll('#za-sev-group .pill-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.textContent.trim() === 'Medium');
  });
  document.getElementById('zoneAlertModal').style.display = 'flex';
};

window.setZaAlertSev = function(el, sev) {
  zaAlertSeverity = sev;
  document.querySelectorAll('#za-sev-group .pill-btn').forEach(function(b) { b.classList.remove('active'); });
  el.classList.add('active');
};

window.updateZaCharCount = function(el) {
  var remaining = 300 - el.value.length;
  document.getElementById('za-char-count').textContent = '(' + remaining + ' chars remaining)';
};

window.broadcastZoneAlert = function() {
  var zoneName = document.getElementById('za-zone-name').value;
  var alertType = document.getElementById('za-alert-type').value;
  var message = document.getElementById('za-message').value.trim();
  var radiusKm = parseFloat(document.getElementById('za-radius').value);
  var sendEmail = document.getElementById('za-channel-email').checked;
  var sendNotif = document.getElementById('za-channel-notif').checked;

  if (!message) { showToast('⚠️', 'Missing Message', 'Please enter a custom message for the alert.', '#ffb347'); return; }

  var zone = ZONES.find(function(z) { return z.name === zoneName; });
  var zoneLat = zone ? zone.lat : 22.2925;
  var zoneLon = zone ? zone.lon : 73.3639;

  var notifPayload = {
    id: 'notif_' + Date.now(),
    type: 'zone_alert',
    zone: zoneName,
    alertType: alertType,
    severity: zaAlertSeverity,
    message: message,
    radius: radiusKm + 'km',
    lat: zoneLat,
    lon: zoneLon,
    timestamp: new Date().toISOString(),
    read: false
  };

  // Retrieve all known users from localStorage
  var allUsers = JSON.parse(localStorage.getItem('trinetra_users') || '[]');

  // Find users within the selected radius
  var matchedUsers = allUsers.filter(function(u) {
    if (!u.lat || !u.lon) return true; // no GPS saved => include
    return haversineKm(zoneLat, zoneLon, u.lat, u.lon) <= radiusKm;
  });

  var matched = matchedUsers.length || 1; // always at least 1 for demo

  // Push notification to trinetra_user_notifications
  if (sendNotif) {
    var existing = JSON.parse(localStorage.getItem('trinetra_user_notifications') || '[]');
    existing.unshift(notifPayload);
    localStorage.setItem('trinetra_user_notifications', JSON.stringify(existing));
    // Trigger update key so user portal polls it
    localStorage.setItem('trinetra_user_notif_updated', Date.now().toString());
  }

  // Email preview toasts
  if (sendEmail) {
    var emailTo = matchedUsers.length > 0 ? matchedUsers[0].email : 'citizens@vadodara.local';
    var ts = new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'});
    showToast('📧', 'Email Dispatched', 'To: ' + emailTo + ' — ⚠️ TRINETRA Safety Alert — ' + zoneName, '#00e676');
    showToast('📬', 'Alert: ' + alertType, message.substring(0, 60) + (message.length > 60 ? '...' : ''), '#ffb347');
  }

  // Also broadcast to portal overlay (admin_broadcast)
  var broadcastPayload = {
    type: alertType,
    zone: zoneName,
    risk: zaAlertSeverity,
    desc: message,
    lat: zoneLat,
    lon: zoneLon,
    timestamp: new Date().toISOString(),
    id: Date.now()
  };
  localStorage.setItem('trinetra_admin_broadcast', JSON.stringify(broadcastPayload));

  postStateToBridge({
    broadcasts: [broadcastPayload],
    notifications: existing
  });

  // Admin bell & alert log
  var sevColor = zaAlertSeverity === 'High' ? '#ff3860' : zaAlertSeverity === 'Medium' ? '#ffb347' : '#00e676';
  addNotification('📡', sevColor, 'Zone Alert: ' + zoneName, alertType + ' — ' + zaAlertSeverity + ' severity dispatched to ' + matched + ' user(s).', false);
  showToast('📡', 'Alert Broadcast!', zoneName + ' — ' + alertType + ' sent to ' + matched + ' nearby citizen(s).', sevColor);

  var tbody = document.getElementById('alertLogBody');
  if (tbody) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="font-family:\'JetBrains Mono\';font-size:0.75rem;">'
      + new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) + '</td>'
      + '<td>' + zoneName + '</td>'
      + '<td style="color:' + sevColor + ';font-weight:600;">' + alertType + '</td>'
      + '<td><span class="z-badge" style="color:' + sevColor + ';background:var(--highBg);border:1px solid rgba(255,56,96,0.2);">' + zaAlertSeverity + ' · ' + radiusKm + 'km</span></td>';
    tbody.insertBefore(tr, tbody.firstChild);
  }

  closeModal('zoneAlertModal');
};
