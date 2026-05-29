/* ═══════════════════════════════════════════════════════════
   TRINETRA AI — Citizen Safety User Portal
   Interactive Location Watch, Forecasts, and Reporting
   ═══════════════════════════════════════════════════════════ */

/* ─── CROSS-IFRAME LOCALSTORAGE BRIDGE ─────────────────── */
/* Streamlit components.html() renders inside an iframe with
   an opaque blob: origin. Each iframe gets its OWN isolated
   localStorage. To share data between Admin (8501) and
   Citizen (8502) dashboards, we redirect all localStorage
   calls to the parent Streamlit window's localStorage, which
   IS shared across tabs on localhost. We also poll for changes
   since storage events don't fire across iframes. */
function postStateToBridge(payload) {
  return fetch('http://localhost:8588/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function(r) { return r.json(); })
    .catch(function(e) { console.error('[TRINETRA BRIDGE] POST error:', e); });
}

/* ─── DATA & ZONES ─────────────────────────────────────── */
function getSavedZones() {
  const defaultZones = [
    {id:"Z01", name:"Parul Campus Central",  risk:"Medium", color:"#ffb347", safety:72, safestTime:"Generally safe inside campus. Maintain caution at night.", lat:22.2925, lon:73.3639, crimes:["Theft (Cellphones)","Shoplifting","Fraud"]},
    {id:"Z02", name:"Limda Village",        risk:"High",   color:"#ff3860", safety:45, safestTime:"Avoid dark alleys after 9 PM. Travel in pairs.", lat:22.2905, lon:73.3695, crimes:["Assault","Robbery","Burglary"]},
    {id:"Z03", name:"Waghodia Crossing",    risk:"High",   color:"#ff3860", safety:49, safestTime:"Heavy highway traffic and isolated spots after 10 PM.", lat:22.2950, lon:73.3450, crimes:["Vehicle Theft","Pickpocketing","Robbery"]},
    {id:"Z04", name:"Parul Hospital Zone",  risk:"Medium", color:"#ffb347", safety:68, safestTime:"Active emergency response. Drive safely.", lat:22.2965, lon:73.3590, crimes:["Vandalism","Theft","Drug Offence"]},
    {id:"Z05", name:"Amrapali Township",    risk:"Low",    color:"#00e676", safety:90, safestTime:"Well-guarded township. Safe at all hours.", lat:22.2855, lon:73.3510, crimes:["Suspicious Vehicle","Trespassing","Littering"]},
    {id:"Z06", name:"Mastana Chowk Hub",    risk:"Low",    color:"#00e676", safety:86, safestTime:"Highly populated food hub. Extremely safe in evenings.", lat:22.2935, lon:73.3690, crimes:["Pocket Theft","Nuisance","Traffic Violation"]},
    {id:"Z07", name:"C V Raman Block",      risk:"Medium", color:"#ffb347", safety:80, safestTime:"Inside campus. Very safe, well lit at night.", lat:22.291895, lon:73.363215, crimes:["Theft (Cellphones)","Shoplifting"]}
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

  // Ensure "C V Raman Block" is always present
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
      crimes: ["Theft (Cellphones)", "Shoplifting"]
    });
  }

  zones.forEach(z => {
    if (z.safety === undefined)   z.safety   = z.risk === "High" ? 45 : z.risk === "Medium" ? 70 : 90;
    if (!z.safestTime)            z.safestTime = z.risk === "High" ? "Avoid isolated spots at night. Travel in groups." : z.risk === "Medium" ? "Standard vigil at late hours. Safe during day." : "Safe neighborhood. Normal precaution.";
    if (!z.crimes)                z.crimes   = z.risk === "High" ? ["Assault","Robbery"] : z.risk === "Medium" ? ["Theft","Vandalism"] : ["Suspicious Activity"];
  });

  localStorage.setItem("trinetra_custom_zones", JSON.stringify(zones));
  return zones;
}

let MOCK_ZONES = getSavedZones();
window.zones = MOCK_ZONES;

const MOCK_COMMUNITY_COMMENTS = {
  "Parul Campus Central": [
    {author:"Rohan K.", initials:"RK", text:"Make sure to lock your bicycles in the campus stands. Two cellphone snatching attempts reported.", time:"2 hours ago", flagged:false},
    {author:"Aisha M.", initials:"AM", text:"Campus security is very cooperative. If you see anything suspicious near hostel gates, let them know.", time:"Yesterday", flagged:false}
  ],
  "Limda Village": [
    {author:"Sameer S.", initials:"SS", text:"Village narrow streets are poorly lit. Avoid walking alone near the back pond after 8 PM.", time:"4 hours ago", flagged:false},
    {author:"Priya G.", initials:"PG", text:"Limda market has lots of crowd. Keep your bags closed while buying groceries.", time:"2 days ago", flagged:false}
  ],
  "Waghodia Crossing": [
    {author:"Neil D.", initials:"ND", text:"Watch out for speeding trucks near the highway crossing. Speeding is a major safety concern here.", time:"5 hours ago", flagged:false}
  ],
  "Parul Hospital Zone": [
    {author:"Kabir S.", initials:"KS", text:"Visible hospital security guards. Generally very responsive and active.", time:"Yesterday", flagged:false}
  ],
  "Amrapali Township": [
    {author:"Tina R.", initials:"TR", text:"Very peaceful residential zone. Streetlights and CCTV are functional.", time:"1 hour ago", flagged:false},
    {author:"Amit V.", initials:"AV", text:"Security guard presence at main gate. Excellent family neighborhood.", time:"3 days ago", flagged:false}
  ],
  "Mastana Chowk Hub": [
    {author:"Sarah F.", initials:"SF", text:"Food stalls are open till late. Great spot to hang out but watch your belongings.", time:"Yesterday", flagged:false}
  ]
};

/* ─── STATE ────────────────────────────────────────────── */
let map = null;
let userLocationMarker = null;
let activeZoneMarkers = [];
let watchId = null;
let userCoords = null;
let activeBoardZone = "Parul Campus Central";
let suggestPriority = "Low";

/* ─── AUTHENTICATION WORKFLOW ──────────────────────────── */
window.loginCitizen = function() {
  const name = document.getElementById("loginName").value.trim();
  const email = document.getElementById("loginEmail").value.trim();
  
  if (!name) { alert("Please enter your name to log in."); return; }
  
  // Create citizen initials
  const parts = name.split(" ");
  const initials = parts.map(p => p[0]).join("").substring(0, 2).toUpperCase();
  
  const session = { name: name, email: email, initials: initials };
  localStorage.setItem("trinetra_citizen", JSON.stringify(session));
  
  bootstrapPortal();
};

window.logoutCitizen = function() {
  localStorage.removeItem("trinetra_citizen");
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  
  document.getElementById("appRoot").style.display = "none";
  document.getElementById("suggestFloatBtn").style.display = "none";
  document.getElementById("loginModal").style.display = "flex";
  
  // Clear inputs
  document.getElementById("loginName").value = "";
  document.getElementById("loginEmail").value = "";
  
  // Reset marker
  if (userLocationMarker && map) {
    map.removeLayer(userLocationMarker);
    userLocationMarker = null;
  }
  userCoords = null;
};

/* ─── PORTAL BOOTSTRAP ────────────────────────────────── */
function bootstrapPortal() {
  const sessionData = localStorage.getItem("trinetra_citizen");
  if (!sessionData) {
    document.getElementById("loginModal").style.display = "flex";
    document.getElementById("appRoot").style.display = "none";
    return;
  }
  
  const citizen = JSON.parse(sessionData);
  
  // Display greeting & initials
  document.getElementById("userGreeting").textContent = `Welcome back, ${citizen.name}`;
  document.getElementById("userAvatar").textContent = citizen.initials;
  
  // Transition views
  document.getElementById("loginModal").style.display = "none";
  document.getElementById("appRoot").style.display = "none";
  document.getElementById("appRoot").style.display = "flex";
  document.getElementById("suggestFloatBtn").style.display = "flex";
  
  // Load past counters
  updateSuggestionsBadgeCount();
  
  // Sync to database
  syncUserToDatabase();
  
  // Init Map and Geo Location
  if (!map) {
    setTimeout(initPortalMap, 100);
  } else {
    setTimeout(function() { map.invalidateSize(); }, 200);
    startLocationTracking();
  }
}

/* ─── MAP INITIALIZATION ───────────────────────────────── */
function initPortalMap() {
  map = L.map('leafletMap', {
    zoomControl: true,
    attributionControl: false
  }).setView([22.2925, 73.3639], 14); // Center around Parul University

  // Add dark tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

  // Render MOCK zone markers
  renderMockZoneMarkers();

  // Load comment boards
  changeCommentsZone(activeBoardZone);

  // Start continuous location watch
  startLocationTracking();
}

function renderMockZoneMarkers() {
  activeZoneMarkers.forEach(m => map.removeLayer(m));
  activeZoneMarkers = [];

  MOCK_ZONES.forEach(z => {
    // Standard zone markers: pulsing rings
    const size = z.risk === 'High' ? 18 : z.risk === 'Medium' ? 14 : 10;
    const ringSize = size * 4;
    const halfRing = ringSize / 2;

    const html = `<div style="position:relative;width:${ringSize}px;height:${ringSize}px;">`
      + `<div class="radar-outer" style="border:1px solid ${z.color};position:absolute;inset:0;border-radius:50%;opacity:0.2;"></div>`
      + `<div class="radar-mid" style="border:1px solid ${z.color};position:absolute;inset:18%;border-radius:50%;opacity:0.35;"></div>`
      + `<div class="radar-ping" style="border:1.5px solid ${z.color};position:absolute;inset:25%;border-radius:50%;animation:radar-ping 2.5s infinite ease-out;"></div>`
      + `<div class="radar-core" style="width:${size}px;height:${size}px;background:${z.color};box-shadow:0 0 12px ${z.color};position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;cursor:pointer;"></div>`
      + `<div class="radar-label" style="position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:8px;font-weight:700;letter-spacing:0.08em;color:rgba(255,255,255,0.7);text-shadow:0 1px 4px rgba(0,0,0,0.8);bottom:${halfRing + size/2 + 6}px;">${z.name}</div>`
      + `</div>`;

    const icon = L.divIcon({
      html: html,
      className: '',
      iconSize: [ringSize, ringSize],
      iconAnchor: [halfRing, halfRing]
    });

    const marker = L.marker([z.lat, z.lon], {icon: icon}).addTo(map);
    
    // Clicking marker sets active board
    marker.on('click', () => {
      changeCommentsZone(z.name);
    });

    activeZoneMarkers.push(marker);
  });
}

/* ─── GEOLOCATION SAFETY WORKFLOW ──────────────────────── */
function startLocationTracking() {
  if (!navigator.geolocation) {
    document.getElementById("locBanner").style.display = "block";
    document.getElementById("coordsHUDVal").textContent = "GPS not supported on device.";
    recalculateLocationSafety(false); // fall back to mock location center (Parul Campus Central)
    return;
  }

  // watchPosition provides real-time active tracking
  watchId = navigator.geolocation.watchPosition(
    function(position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = Math.round(position.coords.accuracy);
      
      userCoords = { lat: lat, lon: lon };
      document.getElementById("locBanner").style.display = "none";
      
      // Update coordinates HUD
      document.getElementById("coordsHUDVal").innerHTML = `LAT: ${lat.toFixed(5)}<br>LNG: ${lon.toFixed(5)}<br>ACCURACY: ±${accuracy}m`;

      // Sync latest coordinates to user database
      syncUserToDatabase();

      // Update pulsing location marker
      updateUserLocationMarker(lat, lon);

      // Analyze closest safety zone
      recalculateLocationSafety(true);
    },
    function(error) {
      console.warn("Location permission error: ", error.message);
      document.getElementById("locBanner").style.display = "block";
      document.getElementById("coordsHUDVal").textContent = "GPS permission denied.";
      recalculateLocationSafety(false); // fall back to mock center (Parul Campus Central)
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function updateUserLocationMarker(lat, lon) {
  if (userLocationMarker) {
    userLocationMarker.setLatLng([lat, lon]);
  } else {
    // pulsing green custom geolocation marker
    const html = '<div style="position:relative;width:28px;height:28px;">'
      + '<div class="geo-ping"></div>'
      + '<div class="geo-core"></div>'
      + '</div>';

    const icon = L.divIcon({
      html: html,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    userLocationMarker = L.marker([lat, lon], {icon: icon}).addTo(map);
    
    // Pan map to location on first capture
    map.setView([lat, lon], 14);
  }
}

// Haversine formula to compute distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

window.recalculateLocationSafety = function(hasLocation = true) {
  // If location isn't active, mock a position near Parul Campus
  const originLat = hasLocation && userCoords ? userCoords.lat : 22.2925;
  const originLon = hasLocation && userCoords ? userCoords.lon : 73.3639;

  let closestZone = MOCK_ZONES[0];
  let minDistance = 999999;

  MOCK_ZONES.forEach(z => {
    const dist = calculateDistance(originLat, originLon, z.lat, z.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closestZone = z;
    }
  });

  // Calculate dynamic proximity safety scores
  let safetyScore = 100;
  let riskClass = "low";
  let barColor = "var(--low)";
  let detailedPhrasing = "";

  if (closestZone.risk === "High" && minDistance < 1.2) {
    safetyScore = Math.max(32, Math.round(closestZone.safety - (minDistance * 5)));
    riskClass = "high";
    barColor = "var(--high)";
    detailedPhrasing = `Your area (${closestZone.name}) has active warnings. ${closestZone.safestTime}`;
  } else if (minDistance < 3.2) {
    safetyScore = Math.round(closestZone.safety + (minDistance * 2));
    if (safetyScore < 80) {
      riskClass = "medium";
      barColor = "var(--med)";
      detailedPhrasing = `Proximity warning near ${closestZone.name}. ${closestZone.safestTime}`;
    } else {
      riskClass = "low";
      barColor = "var(--low)";
      detailedPhrasing = `Low risk recorded nearby near ${closestZone.name}. ${closestZone.safestTime}`;
    }
  } else {
    // Very distant from any hotspots
    safetyScore = 96;
    riskClass = "low";
    barColor = "var(--low)";
    detailedPhrasing = "Excellent safety metrics detected. Normal neighborhood watch practices apply.";
  }

  // Cap safety score boundaries
  safetyScore = Math.min(100, Math.max(0, safetyScore));

  // Render UI updates
  document.getElementById("currentZoneName").textContent = hasLocation ? `Near ${closestZone.name}` : `Parul Campus (Mock)`;
  
  const riskBadge = document.getElementById("currentZoneRisk");
  riskBadge.textContent = `${riskClass.toUpperCase()} RISK`;
  riskBadge.className = `risk-badge ${riskClass}`;

  const scoreVal = document.getElementById("safetyScoreVal");
  scoreVal.textContent = `${safetyScore}/100`;
  scoreVal.style.color = barColor;

  const scoreBar = document.getElementById("safetyScoreBar");
  scoreBar.style.width = `${safetyScore}%`;
  scoreBar.style.background = barColor;

  document.getElementById("safestTimeVal").textContent = detailedPhrasing;

  // List top crimes
  const crimeList = document.getElementById("zoneTopCrimes");
  crimeList.innerHTML = closestZone.crimes.map((c, idx) => {
    return `<div class="simple-item">
      <span>${idx + 1}. ${c}</span>
      <span style="color:${closestZone.color};font-weight:600;">Active</span>
    </div>`;
  }).join('');
};

/* ─── CITIZEN NLP SAFETY REPORTER ──────────────────────── */
async function analyzeCitizenReportWithGemini(text) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=AIzaSyDR98OdtYEHb4XXMgkTp0mEhFbZcX2agbQ`;
  
  const prompt = `You are a citizen safety report analyzer. Analyze the following report from a citizen:\n\n"""\n${text}\n"""\n\nReturn a JSON object with the following keys:\n{\n  "crime": "Short crime category (e.g. Theft / Pickpocket, Robbery / Threat, Assault Incident, Potential Burglary, Suspicious Behavior)",\n  "risk": "High" | "Medium" | "Low",\n  "sentiment": "Urgent" | "Concerned" | "Terrified" | "Calm",\n  "action": "Practical suggested safety action for citizens (e.g., '🚨 DANGER: Get to a safe area immediately. Call emergency dispatch: 100.')"\n}\nReturn ONLY a valid JSON object. Do NOT wrap in markdown block (like \`\`\`json). No explanation, just the raw JSON.`;

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

window.analyzeCitizenReport = async function() {
  const input = document.getElementById("citizenNlpInput").value.trim();
  if (!input) { alert("Please type what you observed first."); return; }

  // Show loading scanner
  const scanner = document.getElementById("nlpScanner");
  const card = document.getElementById("nlpResultCard");
  
  scanner.style.display = "flex";
  card.style.display = "none";

  try {
    const geminiRes = await analyzeCitizenReportWithGemini(input);
    
    scanner.style.display = "none";
    
    var crime = geminiRes.crime || "Suspicious Behavior";
    var risk = geminiRes.risk || "Low";
    var sentiment = geminiRes.sentiment || "Urgent";
    var action = geminiRes.action || "Keep distance, report online. Notify localized patrols.";
    
    var borderCol = "var(--accent)";
    if (risk === 'High') borderCol = "var(--high)";
    else if (risk === 'Medium') borderCol = "var(--med)";
    else if (risk === 'Low') borderCol = "var(--low)";
    
    // Update Result Card
    document.getElementById("nlpResCrime").textContent = crime;
    
    const riskBadge = document.getElementById("nlpResRisk");
    riskBadge.textContent = risk;
    riskBadge.className = `risk-badge ${risk.toLowerCase()}`;

    document.getElementById("nlpResSentiment").textContent = `Sentiment: ${sentiment}`;
    document.getElementById("nlpResSeverity").textContent = `Severity: ${risk}`;
    document.getElementById("nlpResAction").textContent = action;

    card.style.borderLeftColor = borderCol;
    card.style.display = "flex";
  } catch (err) {
    console.error("Gemini API error, falling back to heuristics:", err);
    // Fallback heuristics (same as before but after a 1s delay to feel natural)
    setTimeout(() => {
      scanner.style.display = "none";
      const text = input.toLowerCase();
      let crime = "Suspicious Behavior";
      let risk = "Low";
      let sentiment = "Urgent";
      let action = "Keep distance, report online. Notify localized patrols.";
      let borderCol = "var(--accent)";

      if (text.indexOf("rob") >= 0 || text.indexOf("weapon") >= 0 || text.indexOf("gun") >= 0 || text.indexOf("knife") >= 0) {
        crime = "Robbery / Threat";
        risk = "High";
        sentiment = "Terrified / Urgent";
        action = "🚨 DANGER: Get to a safe area immediately. Call emergency dispatch: 100.";
        borderCol = "var(--high)";
      } else if (text.indexOf("steal") >= 0 || text.indexOf("stolen") >= 0 || text.indexOf("theft") >= 0 || text.indexOf("wallet") >= 0 || text.indexOf("pocket") >= 0) {
        crime = "Theft / Pickpocket";
        risk = "Medium";
        sentiment = "Concerned";
        action = "⚠️ Keep belongings locked. File an online report and check nearby surveillance cameras.";
        borderCol = "var(--med)";
      } else if (text.indexOf("break") >= 0 || text.indexOf("broke") >= 0 || text.indexOf("lock") >= 0 || text.indexOf("house") >= 0) {
        crime = "Potential Burglary";
        risk = "Medium";
        sentiment = "Concerned";
        action = "🔒 Secure all property entryways. Report suspicious lock tampering to police line.";
        borderCol = "var(--med)";
      } else if (text.indexOf("fight") >= 0 || text.indexOf("hit") >= 0 || text.indexOf("assault") >= 0 || text.indexOf("beat") >= 0) {
        crime = "Assault Incident";
        risk = "High";
        sentiment = "Fearful";
        action = "🚨 DANGER: Avoid physical intervention. Alert local street beats or call 100.";
        borderCol = "var(--high)";
      }

      // Update Result Card
      document.getElementById("nlpResCrime").textContent = crime;
      
      const riskBadge = document.getElementById("nlpResRisk");
      riskBadge.textContent = risk;
      riskBadge.className = `risk-badge ${risk.toLowerCase()}`;

      document.getElementById("nlpResSentiment").textContent = `Sentiment: ${sentiment}`;
      document.getElementById("nlpResSeverity").textContent = `Severity: ${risk}`;
      document.getElementById("nlpResAction").textContent = action;

      card.style.borderLeftColor = borderCol;
      card.style.display = "flex";
    }, 1000);
  }
};

/* ─── COMMUNITY COMMENTS FEED ──────────────────────────── */
window.changeCommentsZone = function(zoneName) {
  activeBoardZone = zoneName;
  document.getElementById("boardZoneName").textContent = zoneName;
  renderZoneComments();
};

function renderZoneComments() {
  const feed = document.getElementById("commentsFeed");
  if (!feed) return;

  // Retrieve session for outgoing alignment
  const session = JSON.parse(localStorage.getItem("trinetra_citizen"));
  const currentUser = session ? session.name : "";

  // Fetch comments from localStorage or initialize with mock data
  const key = `trinetra_comments_${activeBoardZone}`;
  let comments = JSON.parse(localStorage.getItem(key));
  if (!comments) {
    comments = MOCK_COMMUNITY_COMMENTS[activeBoardZone] || [];
    localStorage.setItem(key, JSON.stringify(comments));
  }

  if (comments.length === 0) {
    feed.innerHTML = `<div style="text-align:center;color:var(--muted);font-size:0.75rem;padding:30px 10px;">
      Be the first to post a safety update in ${activeBoardZone}!
    </div>`;
    return;
  }

  feed.innerHTML = comments.map((c, idx) => {
    const isOutgoing = c.author === currentUser;
    const bubbleClass = isOutgoing ? "outgoing" : "incoming";
    const metaClass = isOutgoing ? "outgoing" : "";

    const flagHtml = !isOutgoing
      ? `<button class="flag-btn ${c.flagged ? 'flagged' : ''}" onclick="flagComment(${idx})">
          ${c.flagged ? '🚩 Flagged' : '🚩'}
         </button>`
      : "";

    return `<div class="comment-bubble ${bubbleClass}">
      <div class="bubble-meta ${metaClass}">
        <span style="font-weight:600;color:var(--text);">${c.author}</span>
        <span>•</span>
        <span>${c.time}</span>
        <span>•</span>
        ${flagHtml}
      </div>
      <div class="bubble-body">${c.text}</div>
    </div>`;
  }).join('');

  // Scroll comments feed to bottom
  setTimeout(() => { feed.scrollTop = feed.scrollHeight; }, 50);
}

window.checkCommentCharLimit = function(input) {
  const length = input.value.length;
  document.getElementById("charCount").textContent = 200 - length;
};

window.submitZoneComment = function() {
  const input = document.getElementById("newCommentInput");
  const text = input.value.trim();
  if (!text) return;

  const session = JSON.parse(localStorage.getItem("trinetra_citizen"));
  if (!session) return;

  const key = `trinetra_comments_${activeBoardZone}`;
  let comments = JSON.parse(localStorage.getItem(key)) || [];

  const newComment = {
    author: session.name,
    initials: session.initials,
    text: text,
    time: "Just now",
    flagged: false
  };

  comments.push(newComment);
  localStorage.setItem(key, JSON.stringify(comments));

  input.value = "";
  document.getElementById("charCount").textContent = "200";

  renderZoneComments();
};

window.flagComment = function(idx) {
  const key = `trinetra_comments_${activeBoardZone}`;
  let comments = JSON.parse(localStorage.getItem(key)) || [];
  if (!comments[idx]) return;

  comments[idx].flagged = true;
  localStorage.setItem(key, JSON.stringify(comments));

  renderZoneComments();
};

/* ─── FEEDBACK / SUGGESTION PORTAL ─────────────────────── */
window.toggleSuggestModal = function(show = true) {
  const modal = document.getElementById("suggestModal");
  if (show) {
    resetSuggestForm();
    modal.style.display = "flex";
  } else {
    modal.style.display = "none";
  }
};

function resetSuggestForm() {
  document.getElementById("suggestModalForm").style.display = "block";
  document.getElementById("suggestModalSuccess").style.display = "none";
  document.getElementById("suggestModalList").style.display = "none";
  document.getElementById("sugDescription").value = "";
  setSuggestPriority("Low");
}

window.setSuggestPriority = function(priority) {
  suggestPriority = priority;
  const pills = document.querySelectorAll("#sugPriorityGroup .pill-btn");
  pills.forEach(p => {
    if (p.textContent === priority) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });
};

window.submitSuggestion = function() {
  const category = document.getElementById("sugCategory").value;
  const text = document.getElementById("sugDescription").value.trim();
  if (!text) { alert("Please type your suggestion."); return; }

  const session = JSON.parse(localStorage.getItem("trinetra_citizen"));
  const author = session ? session.name : "Anonymous";

  const newSug = {
    category: category,
    description: text,
    priority: suggestPriority,
    author: author,
    timestamp: new Date().toLocaleDateString('en-GB')
  };

  fetch('http://localhost:8588/api/state')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      let suggestions = data.suggestions || [];
      suggestions.push(newSug);
      localStorage.setItem("trinetra_suggestions", JSON.stringify(suggestions));
      
      // Update counters
      updateSuggestionsBadgeCount();
      
      // Show Success checkmark
      document.getElementById("suggestModalForm").style.display = "none";
      document.getElementById("suggestModalSuccess").style.display = "flex";
      
      postStateToBridge({ suggestions: suggestions });
    })
    .catch(function(err) {
      console.warn('[TRINETRA BRIDGE] Suggestion submit failed:', err);
    });
};

window.resetSuggestModalState = function() {
  toggleSuggestModal(false);
};

window.toggleSuggestionsView = function(showList = true) {
  const form = document.getElementById("suggestModalForm");
  const list = document.getElementById("suggestModalList");

  if (showList) {
    form.style.display = "none";
    list.style.display = "block";
    renderPastSuggestionsList();
  } else {
    list.style.display = "none";
    form.style.display = "block";
  }
};

function renderPastSuggestionsList() {
  const scroll = document.getElementById("pastSuggestionsScroll");
  const suggestions = JSON.parse(localStorage.getItem("trinetra_suggestions")) || [];

  if (suggestions.length === 0) {
    scroll.innerHTML = `<div style="text-align:center;color:var(--muted);font-size:0.75rem;padding:30px 10px;">
      No suggestions submitted yet.
    </div>`;
    return;
  }

  // Reverse list to show newest on top
  const listItems = [...suggestions].reverse();

  scroll.innerHTML = listItems.map(s => {
    let pColor = "var(--low)";
    if (s.priority === "High") pColor = "var(--high)";
    else if (s.priority === "Medium") pColor = "var(--med)";

    return `<div class="suggestion-item">
      <div class="sug-meta-row">
        <span style="color:var(--accent);font-weight:600;">${s.category}</span>
        <span style="color:${pColor};font-weight:700;text-transform:uppercase;">${s.priority} PRIORITY</span>
      </div>
      <div style="font-size:0.75rem;line-height:1.4;margin:2px 0;opacity:0.9;">"${s.description}"</div>
      <div class="sug-meta-row" style="margin-top:2px;">
        <span>By ${s.author}</span>
        <span>${s.timestamp}</span>
      </div>
    </div>`;
  }).join('');
}

function updateSuggestionsBadgeCount() {
  const suggestions = JSON.parse(localStorage.getItem("trinetra_suggestions")) || [];
  document.getElementById("sugBadgeCount").textContent = suggestions.length;
}

/* ─── USER NOTIFICATION CENTER VARIABLES ──────────────── */
let userNotifActiveTab = 'All';
let seenHighNotifIds = JSON.parse(sessionStorage.getItem('trinetra_seen_high_notifs') || '[]');
let seenNotifIds = JSON.parse(sessionStorage.getItem('trinetra_seen_notifs') || '[]');

/* ─── CROSS-DASHBOARD POLLING ENGINE VIA HTTP BRIDGE ──── */
var _lastBroadcastId = null;

window.syncWithBridgeOnBoot = function() {
  fetch('http://localhost:8588/api/state')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      console.log('[TRINETRA BRIDGE] Initial state loaded:', data);
      
      // 1. Sync zones
      if (data.zones && data.zones.length > 0) {
        MOCK_ZONES = data.zones;
        window.zones = MOCK_ZONES;
        localStorage.setItem("trinetra_custom_zones", JSON.stringify(MOCK_ZONES));
        if (map) renderMockZoneMarkers();
        recalculateLocationSafety(userCoords !== null);
      }
      
      // 2. Sync notifications
      if (data.notifications && data.notifications.length > 0) {
        localStorage.setItem('trinetra_user_notifications', JSON.stringify(data.notifications));
        loadUserNotifications();
      }
      
      // 3. Sync suggestions
      if (data.suggestions && data.suggestions.length > 0) {
        localStorage.setItem('trinetra_suggestions', JSON.stringify(data.suggestions));
        updateSuggestionsBadgeCount();
      }
      
      // 4. Initialize broadcast tracking ID
      if (data.broadcasts && data.broadcasts.length > 0) {
        _lastBroadcastId = data.broadcasts[data.broadcasts.length - 1].id;
      } else {
        _lastBroadcastId = 0;
      }
    })
    .catch(function(err) {
      console.warn('[TRINETRA BRIDGE] Could not connect to bridge server on boot:', err.message);
    });
};

function pollForAdminChanges() {
  fetch('http://localhost:8588/api/state')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      // 1. Sync zones (handles deletions, updates, additions)
      if (data.zones && data.zones.length > 0) {
        var localZonesStr = localStorage.getItem("trinetra_custom_zones");
        var remoteZonesStr = JSON.stringify(data.zones);
        if (remoteZonesStr !== localZonesStr) {
          console.log('[TRINETRA POLL] Zones update detected via bridge');
          var oldZones = MOCK_ZONES;
          MOCK_ZONES = data.zones;
          window.zones = MOCK_ZONES;
          localStorage.setItem("trinetra_custom_zones", remoteZonesStr);
          if (map) { renderMockZoneMarkers(); }
          recalculateLocationSafety(userCoords !== null);
          
          if (oldZones.length > 0) {
            data.zones.forEach(function(newZone) {
              var isNew = !oldZones.some(function(z) { return z.id === newZone.id || z.name === newZone.name; });
              if (isNew) {
                var userLat = userCoords ? userCoords.lat : 22.2925;
                var userLon = userCoords ? userCoords.lon : 73.3639;
                var dist = calculateDistance(userLat, userLon, newZone.lat, newZone.lon);
                if (dist <= 2.0) {
                  showToast('📍', 'New Zone Nearby', 'New zone added near you: ' + newZone.name, '#00d2ff');
                }
              }
            });
          }
          
          var zoneExists = MOCK_ZONES.some(function(z) { return z.name === activeBoardZone; });
          if (!zoneExists && MOCK_ZONES.length > 0) {
            changeCommentsZone(MOCK_ZONES[0].name);
          }
        }
      }

      // 2. Sync broadcasts
      if (data.broadcasts && data.broadcasts.length > 0) {
        var latestB = data.broadcasts[data.broadcasts.length - 1];
        if (_lastBroadcastId === null) {
          _lastBroadcastId = latestB.id;
        } else if (latestB.id !== _lastBroadcastId) {
          _lastBroadcastId = latestB.id;
          console.log('[TRINETRA POLL] Admin broadcast detected via bridge:', latestB.type);
          handleAdminBroadcast(latestB);
        }
      }

      // 3. Sync notifications
      if (data.notifications) {
        var localNotifsStr = localStorage.getItem('trinetra_user_notifications');
        var remoteNotifsStr = JSON.stringify(data.notifications);
        if (remoteNotifsStr !== localNotifsStr) {
          console.log('[TRINETRA POLL] Notification update detected via bridge');
          localStorage.setItem('trinetra_user_notifications', remoteNotifsStr);
          loadUserNotifications();
        }
      }
    })
    .catch(function(err) {
      console.warn('[TRINETRA POLL] Polling cycle connection error:', err.message);
    });
}

/* ─── BOOTSTRAP TRIGGER ────────────────────────────────── */
window.onload = function() {
  if (window.LOGO_B64) {
    document.getElementById('trinetraLogo').src = window.LOGO_B64;
  }

  // Sync state from bridge on boot
  syncWithBridgeOnBoot();

  bootstrapPortal();

  // Start 2-second polling for changes via bridge
  setInterval(pollForAdminChanges, 2000);

  // Also poll notifications every 10s as backup
  setInterval(function() {
    loadUserNotifications();
  }, 10000);
};


/* ─── TOAST NOTIFICATIONS ────────────────────────────── */
function showToast(icon, title, msg, color) {
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var el = document.createElement('div');
  el.className = 'toast-item';
  if (color) el.style.borderLeft = '3px solid ' + color;
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
  el.style.animation = 'toast-out 0.3s ease forwards';
  setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
}

/* ─── REAL-TIME DATABASE SYNC ────────────────────────── */
window.syncUserToDatabase = function() {
  const sessionData = localStorage.getItem("trinetra_citizen");
  if (!sessionData) return;
  const citizen = JSON.parse(sessionData);
  
  fetch('http://localhost:8588/api/state')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      let allUsers = data.users || [];
      let user = allUsers.find(u => u.email === citizen.email || u.name === citizen.name);
      if (!user) {
        user = { name: citizen.name, email: citizen.email || (citizen.name.toLowerCase().replace(/\s+/g, '') + "@vadodara.gov.in") };
        allUsers.push(user);
      }
      user.lat = userCoords ? userCoords.lat : 22.2925;
      user.lon = userCoords ? userCoords.lon : 73.3639;
      user.lastActive = new Date().toISOString();
      
      localStorage.setItem("trinetra_users", JSON.stringify(allUsers));
      postStateToBridge({ users: allUsers });
    })
    .catch(function(err) {
      console.warn('[TRINETRA BRIDGE] User database sync failed:', err.message);
    });
};

/* ─── USER NOTIFICATION CENTER IMPLEMENTATION ─────────── */
window.loadUserNotifications = function() {
  let notifs = JSON.parse(localStorage.getItem('trinetra_user_notifications') || '[]');
  
  // Pre-populate mock system notifications if list is empty
  if (notifs.length === 0) {
    notifs = [
      {
        id: 'sys_notif_1',
        type: 'system',
        alertType: 'System Connected',
        severity: 'Low',
        message: '⚡ TRINETRA Safety Engine online. Successfully synchronized with Vadodara City Police command center.',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        read: false
      },
      {
        id: 'sys_notif_2',
        type: 'system',
        alertType: 'GPS Active',
        severity: 'Low',
        message: '📍 Precise neighborhood tracking is active. Real-time safety calculations enabled.',
        timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
        read: false
      }
    ];
    localStorage.setItem('trinetra_user_notifications', JSON.stringify(notifs));
  }
  
  // Check for new notifications to show toast alerts (except system default on page load)
  checkNewNotifications(notifs);
  
  // Check for new high-severity notifications to flash screen + beep
  checkNewHighSeverityNotifs(notifs);
  
  // Render list inside drawer
  renderUserNotifications();
  
  // Render active alerts banners at the topbar base
  renderHighSeverityBanners(notifs);
};

function checkNewNotifications(notifs) {
  let hasNew = false;
  notifs.forEach(n => {
    if (!seenNotifIds.includes(n.id)) {
      seenNotifIds.push(n.id);
      hasNew = true;
      
      // Only show toast if it is a real zone_alert or system update dispatched after startup
      if (!n.id.startsWith('sys_notif_')) {
        const icon = n.severity === 'High' ? '🚨' : n.severity === 'Medium' ? '⚠️' : '🔔';
        const color = n.severity === 'High' ? 'var(--high)' : n.severity === 'Medium' ? 'var(--med)' : 'var(--low)';
        showToast(icon, n.alertType || 'New Notification', n.message, color);
      }
    }
  });
  if (hasNew) {
    sessionStorage.setItem('trinetra_seen_notifs', JSON.stringify(seenNotifIds));
  }
}

function checkNewHighSeverityNotifs(notifs) {
  let hasNewHigh = false;
  notifs.forEach(n => {
    if (n.severity === 'High' && !seenHighNotifIds.includes(n.id)) {
      seenHighNotifIds.push(n.id);
      hasNewHigh = true;
    }
  });
  if (hasNewHigh) {
    sessionStorage.setItem('trinetra_seen_high_notifs', JSON.stringify(seenHighNotifIds));
    triggerScreenFlash();
  }
}

window.triggerScreenFlash = function() {
  const overlay = document.getElementById("screenFlashOverlay");
  if (!overlay) return;
  
  overlay.style.display = "block";
  overlay.style.animation = "alert-shake 0.5s ease-in-out 3";
  
  playSynthesizedBeep();
  
  setTimeout(() => {
    overlay.style.display = "none";
    overlay.style.animation = "";
  }, 1500);
};

let globalAudioCtx = null;

function getAudioContext() {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  return globalAudioCtx;
}

// Unlock audio context on any user interaction in the document
function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      // Play a quick silent sound to fully wake up the audio context
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      osc.start(0);
      osc.stop(0.001);
      console.log('[TRINETRA] AudioContext successfully unlocked via user interaction!');
      
      // Remove listeners once unlocked
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    });
  }
}
window.addEventListener('click', unlockAudio);
window.addEventListener('keydown', unlockAudio);
window.addEventListener('touchstart', unlockAudio);

window.playSynthesizedBeep = function() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      console.warn('[TRINETRA] AudioContext is suspended. Autoplay blocked.');
      showToast('🔊', 'Enable Alarm Sounds', 'Please click anywhere on the page to unlock real-time safety audio alerts.', 'var(--accent)');
      // Attempt to resume right away
      ctx.resume().catch(function(e) { console.warn('Immediate resume failed:', e); });
      return;
    }

    // Cyberpunk warning sound: three rapid pulses with volume envelope
    const playBeep = (delay, duration, freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };

    // Siren beep sequence: high-pitched cyber warnings
    playBeep(0, 0.18, 880);
    playBeep(0.22, 0.18, 880);
    playBeep(0.44, 0.28, 1100);
  } catch (err) {
    console.error("Web Audio API blocked or error: ", err);
  }
};

window.renderUserNotifications = function() {
  const listEl = document.getElementById('userNotifList');
  if (!listEl) return;
  
  const notifs = JSON.parse(localStorage.getItem('trinetra_user_notifications') || '[]');
  
  // Calculate unread count
  const unreadCount = notifs.filter(n => !n.read).length;
  const badge = document.getElementById('userNotifBadge');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }
  
  // Filter by tab selection
  let filtered = notifs;
  if (userNotifActiveTab === 'Unread') {
    filtered = notifs.filter(n => !n.read);
  } else if (userNotifActiveTab === 'Zone Alerts') {
    filtered = notifs.filter(n => n.type === 'zone_alert');
  } else if (userNotifActiveTab === 'System') {
    filtered = notifs.filter(n => n.type === 'system');
  }
  
  if (filtered.length === 0) {
    listEl.innerHTML = `<div style="text-align:center;color:var(--muted);font-size:0.75rem;padding:40px 10px;">
      No notifications in this category.
    </div>`;
    return;
  }
  
  listEl.innerHTML = filtered.map(n => {
    const cardClass = 'notif-card' + (n.read ? ' read' : ' unread') + 
      (n.severity === 'High' ? ' high-sev' : n.severity === 'Medium' ? ' med-sev' : ' low-sev');
    
    const timeStr = new Date(n.timestamp).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'});
    const readBtn = !n.read ? `<button class="notif-btn" onclick="markUserNotifAsRead('${n.id}')">✓ Mark Read</button>` : '';
    const flyBtn = (n.lat && n.lon) ? `<button class="notif-btn" style="border-color:var(--accent);color:var(--accent);" onclick="flyToMap(${n.lat}, ${n.lon}, '${n.zone}')">🗺️ Locate</button>` : '';
    
    const badgeColor = n.severity === 'High' ? 'var(--high)' : n.severity === 'Medium' ? 'var(--med)' : 'var(--low)';
    
    return `<div class="${cardClass}">
      <div class="notif-header">
        <span class="notif-title" style="display:flex;align-items:center;gap:6px;">
          <span style="width:6px;height:6px;border-radius:50%;background:${badgeColor};"></span>
          ${n.alertType || 'Alert'}
        </span>
        <span style="font-family:'JetBrains Mono';font-size:0.6rem;color:var(--muted);">${timeStr}</span>
      </div>
      <div class="notif-msg">${n.message}</div>
      <div class="notif-meta">
        <span>Zone: ${n.zone || 'System'}</span>
        <span>Severity: ${n.severity}</span>
      </div>
      <div class="notif-actions">
        ${readBtn}
        ${flyBtn}
      </div>
    </div>`;
  }).join('');
};

window.toggleUserNotifDrawer = function(show = null) {
  const drawer = document.getElementById('userNotifDrawer');
  if (!drawer) return;
  
  if (show === null) {
    show = drawer.style.display === 'none';
  }
  
  drawer.style.display = show ? 'flex' : 'none';
  if (show) {
    loadUserNotifications();
  }
};

window.filterUserNotifs = function(tab) {
  userNotifActiveTab = tab;
  
  const tabs = ['All', 'Unread', 'Zone Alerts', 'System'];
  const tabIds = {
    'All': 'un-tab-all',
    'Unread': 'un-tab-unread',
    'Zone Alerts': 'un-tab-alerts',
    'System': 'un-tab-system'
  };
  
  tabs.forEach(t => {
    const el = document.getElementById(tabIds[t]);
    if (el) {
      if (t === tab) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  });
  
  renderUserNotifications();
};

window.markUserNotifAsRead = function(id) {
  const notifs = JSON.parse(localStorage.getItem('trinetra_user_notifications') || '[]');
  const match = notifs.find(n => n.id === id);
  if (match) {
    match.read = true;
    localStorage.setItem('trinetra_user_notifications', JSON.stringify(notifs));
    loadUserNotifications();
    postStateToBridge({ notifications: notifs });
  }
};

window.markAllUserNotifsAsRead = function() {
  const notifs = JSON.parse(localStorage.getItem('trinetra_user_notifications') || '[]');
  notifs.forEach(n => n.read = true);
  localStorage.setItem('trinetra_user_notifications', JSON.stringify(notifs));
  loadUserNotifications();
  postStateToBridge({ notifications: notifs });
};

window.flyToMap = function(lat, lon, zoneName) {
  if (map) {
    map.setView([lat, lon], 15);
    
    // Cyberpunk pulsing circular wave overlay around target zone
    const pulseCircle = L.circle([lat, lon], {
      radius: 120,
      color: 'var(--high)',
      fillColor: 'var(--high)',
      fillOpacity: 0.15,
      weight: 2
    }).addTo(map);
    
    let count = 0;
    const interval = setInterval(() => {
      pulseCircle.setRadius(120 + count * 20);
      pulseCircle.setStyle({ opacity: 1 - count * 0.2, fillOpacity: 0.15 - count * 0.03 });
      count++;
      if (count > 5) {
        clearInterval(interval);
        map.removeLayer(pulseCircle);
      }
    }, 100);
  }
  
  if (zoneName && zoneName !== 'System') {
    changeCommentsZone(zoneName);
  }
  
  // Close the sliding drawer
  toggleUserNotifDrawer(false);
};

window.renderHighSeverityBanners = function(notifs) {
  const container = document.getElementById('highAlertBannerContainer');
  if (!container) return;
  
  // Filter active unread high-severity alerts
  const activeHigh = notifs.filter(n => n.severity === 'High' && !n.read);
  
  if (activeHigh.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = activeHigh.map(n => {
    return `<div class="high-alert-banner" onclick="flyToMap(${n.lat}, ${n.lon}, '${n.zone}')" style="cursor:pointer; padding: 10px 20px; font-weight:700;">
      🚨 CRITICAL DISPATCH: ${n.alertType} near ${n.zone}! Message: "${n.message}" (Click to pan to Map)
    </div>`;
  }).join('');
};

/* ─── CROSS-DASHBOARD SYNC ────────────────────────────── */
/* NOTE: The old window.addEventListener('storage', ...) listener has been
   replaced by the pollForAdminChanges() polling engine above, which runs
   every 2 seconds. This is necessary because Streamlit's components.html()
   renders in iframes with opaque origins, preventing storage events from
   firing across the admin and citizen dashboards. */


function handleAdminBroadcast(payload) {
  // Check if user settings restrict to proximity alerts only (1km radius)
  const proximityOnly = document.getElementById("proximityAlertsOnly")?.checked;
  if (proximityOnly) {
    let zoneLat = payload.lat;
    let zoneLon = payload.lon;
    if (zoneLat === undefined || zoneLon === undefined) {
      const targetZone = MOCK_ZONES.find(z => z.name.toLowerCase() === payload.zone.toLowerCase());
      if (targetZone) {
        zoneLat = targetZone.lat;
        zoneLon = targetZone.lon;
      }
    }
    
    if (zoneLat !== undefined && zoneLon !== undefined) {
      const userLat = userCoords ? userCoords.lat : 22.2925;
      const userLon = userCoords ? userCoords.lon : 73.3639;
      
      const dist = calculateDistance(userLat, userLon, zoneLat, zoneLon);
      if (dist > 1.0) {
        console.log(`Alert ignored. Distance to incident is ${dist.toFixed(2)}km (> 1km).`);
        return;
      }
    }
  }

  // 1. Update Warning Overlay UI
  document.getElementById("bw-type").textContent = payload.type || "N/A";
  document.getElementById("bw-zone").textContent = payload.zone || "N/A";
  document.getElementById("bw-risk").textContent = (payload.risk || "High").toUpperCase() + " RISK";
  document.getElementById("bw-desc").textContent = `"${payload.desc || 'Critical incident reported. Avoid the area.'}"`;

  // Display the fullscreen overlay
  const overlay = document.getElementById("broadcastWarningOverlay");
  if (overlay) {
    overlay.style.display = "flex";
  }

  // 2. Modify target zone risk and safety stats in memory
  const targetZone = MOCK_ZONES.find(z => z.name.toLowerCase() === payload.zone.toLowerCase());
  if (targetZone) {
    targetZone.risk = payload.risk || "High";
    targetZone.safety = payload.risk === "High" ? 15 : payload.risk === "Medium" ? 45 : 75;
    targetZone.color = payload.risk === "High" ? "#ff3860" : payload.risk === "Medium" ? "#ffb347" : "#00e676";
    if (map) {
      renderMockZoneMarkers();
    }
  }

  // Recalculate local zone safety metrics instantly
  recalculateLocationSafety(userCoords !== null);

  // 3. Inject simulated police alert to the zone's community comments feed
  const commentKey = `trinetra_comments_${payload.zone}`;
  let comments = JSON.parse(localStorage.getItem(commentKey)) || [];
  
  comments = comments.filter(c => !c.isPoliceDispatch);

  comments.push({
    author: "🚨 POLICE DISPATCHER",
    initials: "PD",
    text: `CRITICAL TACTICAL WARNING: ${payload.type} incident reported. Area risk escalated to ${payload.risk}. Citizens advised to remain vigilant.`,
    time: "Just now",
    flagged: false,
    isPoliceDispatch: true
  });
  localStorage.setItem(commentKey, JSON.stringify(comments));

  if (activeBoardZone.toLowerCase() === payload.zone.toLowerCase()) {
    renderZoneComments();
  }

  // 4. Fire Browser Push Notification
  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      new Notification('🚨 TRINETRA DISPATCH WARNING', {
        body: `CRITICAL: Vadodara Police dispatched tactical warning for ${payload.zone}! Type: ${payload.type}`
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          new Notification('🚨 TRINETRA DISPATCH WARNING', {
            body: `CRITICAL: Vadodara Police dispatched tactical warning for ${payload.zone}! Type: ${payload.type}`
          });
        }
      });
    }
  }
}

window.acknowledgeBroadcastAlert = function() {
  const overlay = document.getElementById("broadcastWarningOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
};

