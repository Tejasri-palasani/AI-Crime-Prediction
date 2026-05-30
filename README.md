<div align="center">

<img src="app/logo.png" alt="TRINETRA AI Logo" width="120"/>

# 🔴 TRINETRA AI
### Real-Time Crime Prediction & Citizen Safety Platform
**Vadodara — Parul University Campus & Surrounding Zones**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.27-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)](https://streamlit.io/)
[![Leaflet.js](https://img.shields.io/badge/Leaflet.js-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-NLP-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Overview

**TRINETRA AI** is a full-stack, real-time dual-dashboard crime prediction and citizen safety platform built for Vadodara, Gujarat, India — specifically covering **Parul University campus** and its surrounding zones.

The system consists of **two independent web applications** that communicate in real-time through a custom-built Python HTTP Sync Bridge on port `8588`, completely bypassing browser same-origin policy restrictions:

| Dashboard | Port | Audience |
|-----------|------|----------|
| 🏢 **Admin Command Center** | `8601` | Police officers, security admins |
| 🟢 **Citizen Safety Portal** | `8602` | Students, residents, public citizens |
| 📡 **HTTP Sync Bridge API** | `8588` | Internal — both dashboards connect here |

---

## 🗂️ Project Structure

```
crime_prediction_project/
├── .gitignore
└── crime_prediction/
    ├── README.md                        ← This file
    ├── requirements.txt                 ← Python dependencies
    │
    ├── app/                             ← 🏢 Admin Command Center
    │   ├── dashboard.py                 ← Streamlit server + HTTP bridge launcher
    │   ├── dashboard.html               ← Full Admin UI (map, charts, alerts, NLP)
    │   ├── script.js                    ← Admin logic, map engine, bridge sync
    │   ├── style.css                    ← Dark cyberpunk UI theme
    │   ├── logo.png                     ← TRINETRA brand logo
    │   └── trinetra_shared_state.json   ← Shared real-time state (auto-generated)
    │
    ├── user/                            ← 🟢 Citizen Safety Portal
    │   ├── portal.py                    ← Streamlit server + bridge self-healer
    │   ├── portal.html                  ← Full Citizen UI (map, GPS, notifications)
    │   ├── script.js                    ← Citizen logic, polling, audio alerts
    │   ├── style.css                    ← Dark glassmorphic citizen UI theme
    │   └── logo.png                     ← TRINETRA brand logo
    │
    └── src/                             ← ML Pipeline (XGBoost, LSTM, NLP)
        ├── preprocess.py                ← Data loading & feature engineering
        ├── train_model.py               ← XGBoost crime risk classifier
        ├── predict.py                   ← Zone-level risk prediction engine
        ├── map_builder.py               ← Folium heatmap generator
        ├── nlp_extractor.py             ← spaCy police report NLP pipeline
        └── lstm_forecaster.py           ← LSTM time-series crime forecaster
```

---

## ⚡ Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 2. Run Both Dashboards

Open **two separate terminal windows** and run:

**Terminal 1 — Admin Command Center:**
```bash
cd crime_prediction_project
streamlit run crime_prediction/app/dashboard.py --server.port 8601
```

**Terminal 2 — Citizen Safety Portal:**
```bash
cd crime_prediction_project
streamlit run crime_prediction/user/portal.py --server.port 8602
```

### 3. Open in Browser

| App | URL |
|-----|-----|
| 🏢 Admin Command Center | http://localhost:8601 |
| 🟢 Citizen Safety Portal | http://localhost:8602 |

> **Tip:** Open both side-by-side to see real-time synchronization in action!

---

## 🏢 Admin Command Center — Features

### 1. 🗺️ Interactive Live Crime Map (Leaflet.js)
The centerpiece of the admin dashboard — a real-time interactive map showing all crime zones with animated radar-style pulsing markers.

- **Four Map Modes**: Grid (default cyberpunk grid), Dark (CartoDB), Street (OpenStreetMap), Satellite (ArcGIS)
- **Radar Markers**: Each zone renders three concentric animated rings — outer ring, mid ring, and a pulsing animated ping — color-coded by risk level (🔴 High, 🟠 Medium, 🟢 Low)
- **Time Slider**: A 24-hour slider at the bottom adjusts marker sizes dynamically based on historical crime patterns throughout the day
- **Patrol Route**: One-click optimized patrol polyline connecting all High and Medium risk zones in sequence

### 2. 📍 Zone Drill-Down Panel
Click any zone marker on the map to open a detailed drill-down side panel:

- **Zone Statistics**: Shows total reported incidents count and AI confidence score (%)
- **Risk Badge**: Color-coded dynamic risk level badge
- **Recent Activity Feed**: Live incidents filtered to the selected zone
- **Zone Actions**: Two quick-action buttons:
  - 🗑️ **Remove Zone** — permanently deletes the zone from the map and syncs with the Citizen Portal
  - 📡 **Send Zone Alert** — opens the targeted alert dispatch modal pre-filled with the zone name

### 3. 📊 Analytics Dashboard (Chart.js)
A dedicated Analytics tab with three interactive charts:

- **LSTM Forecast Line Chart**: 7-day predicted crime incident forecast (Mon–Sun) rendered as a smooth gradient-filled line chart powered by simulated LSTM projections
- **Risk Distribution Donut Chart**: Visual breakdown of zones by risk level — shows real-time High/Medium/Low zone counts with an animated center total counter
- **Crime Type Bar Chart**: Horizontal bar visualization of the top 7 reported crime categories (Theft, Assault, Burglary, Vehicle, Drug, Vandalism, Fraud)

### 4. 🧠 AI NLP Police Report Analyzer (Gemini 1.5 Flash)
A powerful Natural Language Processing tool for law enforcement:

- **Input**: Paste one or multiple police report paragraphs (separated by double blank lines)
- **Gemini AI Analysis**: Each paragraph is sent to Google's Gemini 1.5 Flash model which returns:
  - **Crime Classification**: Robbery, Assault, Theft, Burglary, Drug Offense, Vandalism, or Unknown
  - **ICD-10 External Cause Code**: Medical/legal code (e.g., `X52`, `X93`, `W32`)
  - **Sentiment Analysis**: Fearful, Negative, Calm, Concerned, Urgent
  - **Severity Rating**: High, Medium, or Low
  - **Preview Summary**: Concise 100-character summary of the report
- **Offline Fallback**: If the Gemini API is unavailable, a built-in keyword heuristic engine instantly classifies reports using pattern matching

### 5. 📡 Zone Alert Dispatch System
The core alert broadcasting tool — dispatches targeted safety warnings to citizens in real-time:

- **Zone Selector**: Pre-filled with the currently inspected zone name
- **Alert Types**: Suspicious Activity, High Risk Spike, Police Advisory, Evacuation Notice, General Warning
- **Severity Levels**: Low / Medium / High pill selectors with color coding
- **Custom Message**: Rich text area with live 300-character countdown
- **Radius Targeting**: Filter notifications to citizens within 500m, 1km, 2km, or 5km of the zone
- **Delivery Channels**:
  - 📧 Mock Email — simulates dispatch email sent to matched users with toast confirmation
  - 🔔 Dashboard Notification — pushes live notification cards to Citizen Portal in real-time via the HTTP bridge
- **Automatic Effect**: Matched citizens receive a screen flash + cyberpunk audio alarm + banner within 2 seconds

### 6. 🚨 Crime Dispatch Wizard Modal
A step-by-step guided wizard for formally dispatching a crime record:

- **Step 1**: Category selection (Robbery, Assault, Drug Offense, etc.)
- **Step 2**: Zone selection from dropdown, risk severity pill selection
- **Step 3**: Full incident description text field with a live email preview panel
- **Multi-Channel Dispatch**: Toggles for Browser Push Notification and Citizen Portal broadcast
- **Alert Log Update**: Automatically appends a new row to the Alerts History table

### 7. 🗺️ Add New Zone (Place) Tool
Dynamically extend the crime monitoring coverage:

- **Form Fields**: Zone name, latitude, longitude, risk level selector
- **Auto-Metadata**: Automatically computes safety score, crime types, and safest time description based on selected risk level
- **Instant Map Update**: New radar marker appears on both Admin and Citizen maps within 2 seconds via the sync bridge
- **Live Sync**: Writes the new zone to the shared HTTP bridge state — Citizen Portal picks it up immediately

### 8. 🔔 Admin Notification Bell
A real-time notification feed in the Admin topbar:

- **Bell Badge**: Animated unread count badge with pop animation on new notifications
- **Sliding Drawer**: Glassmorphic side drawer listing all system events with icons, colors, timestamps
- **Auto-Feed**: Mock critical alerts auto-generated every 28 seconds simulating live law enforcement updates
- **Clear All**: One-click notification history wipe

### 9. 📋 Alerts History Log Table
A persistent incident audit trail visible in the Alerts tab:

- Each row records: Timestamp, Zone Name, Incident Type, Status badge (Logged / Dispatched / 1km Broadcast)
- Auto-scrolling with a max of 20 recent entries shown
- Color-coded status column matching risk severity

### 10. 🌗 Light / Dark Theme Toggle
- One-click toggle between a sleek dark cyberpunk mode and a clean light mode
- Uses CSS custom properties (`data-theme` attribute) ensuring all components update seamlessly

### 11. 🖨️ PDF Export
- Exports the current active tab as a printed PDF via the browser's native print dialog
- Special handling for the Map tab to ensure proper rendering

---

## 🟢 Citizen Safety Portal — Features

### 1. 🔐 Citizen Login & Session System
A secure, minimal-friction authentication system for citizens:

- **Login Modal**: Glassmorphic modal card with Full Name and Email fields
- **Session Creation**: Stores user credentials, computed initials (`Sameer Shah` → `SS`), and profile in browser localStorage
- **Avatar Pill**: Dynamic initials avatar displayed in the topbar with a full greeting (`Welcome back, Sameer Shah`)
- **Secure Logout**: Clears session, GPS watch, user marker, and resets to login modal

### 2. 📍 Real-Time GPS Location Tracking
The citizen's live geolocation is tracked continuously using the browser's Geolocation API:

- **High-Accuracy Watch**: Uses `navigator.geolocation.watchPosition` with `enableHighAccuracy: true` for the most precise position updates
- **Pulsing "YOU ARE HERE" Marker**: A custom neon green animated marker with a radial ping effect renders on the Leaflet map at the user's real position
- **Coordinates HUD Panel**: A floating HUD displays live latitude, longitude, and GPS accuracy in meters
- **Auto Map Pan**: The map automatically centers on the user's first GPS fix
- **Permission Banner**: If location access is denied, a warning banner appears prompting the user to enable GPS
- **Bridge Sync**: Every GPS update is also POSTed to the HTTP bridge so Admin can see live user locations for targeted alerts

### 3. 🔮 Proximity Safety Score Calculator
Real-time personal safety assessment using the Haversine distance formula:

- **Haversine Distance**: Calculates precise km distance between user GPS coordinates and all 7+ monitored crime zones
- **Dynamic Safety Score**: Computes a 0–100 safety score based on:
  - Distance to nearest zone (< 1.2km in High risk zone = critical scoring)
  - Zone's base safety value
  - Risk class thresholds (High / Medium / Low)
- **Color-Coded Score Bar**: An animated gradient progress bar changes color — red (danger), amber (caution), green (safe)
- **Contextual Safety Message**: Dynamic descriptive text updates (e.g., *"Your area (Limda Village) has active warnings. Avoid dark alleys after 9 PM. Travel in pairs."*)
- **Active Crime List**: Top reported crime types for the nearest zone are listed with status badges

### 4. 🧠 Citizen NLP Safety Reporter (Gemini AI)
Empowers citizens to quickly log safety observations in plain English:

- **Input**: A text area where citizens describe what they witnessed
- **AI Scanner Loader**: An animated scanning progress indicator appears while the report is being analyzed
- **Gemini 1.5 Flash Analysis**: Returns:
  - **Crime Category**: Theft/Pickpocket, Robbery/Threat, Assault Incident, Potential Burglary, Suspicious Behavior
  - **Risk Level**: High, Medium, or Low
  - **Emotional Sentiment**: Urgent, Concerned, Terrified, or Calm
  - **Actionable Advice**: Specific, immediate citizen safety action (e.g., *"🚨 DANGER: Get to a safe area immediately. Call emergency dispatch: 100."*)
- **Styled Result Card**: A bordered glow card with risk-appropriate border color displays the full analysis
- **Offline Fallback**: Keyword-based heuristic engine activates automatically if Gemini is unavailable

### 5. 💬 Zone-Specific Community Comments Board
A real-time community safety forum tied to each crime zone:

- **Zone-Linked Board**: Clicking any zone marker on the map switches the comments board to show posts for that zone
- **Chat Bubble UI**:
  - 🟣 **Outgoing** (your posts): Right-aligned violet-glowing bubble
  - ⚫ **Incoming** (other citizens): Left-aligned dark glass bubble with author name and timestamp
- **Post Submission**: 200-character limit with a live countdown counter
- **🚩 Flag System**: Suspicious comments can be flagged by other citizens — flagged comments show a 🚩 Flagged badge
- **Police Dispatcher Posts**: When Admin dispatches an alert, an automated `🚨 POLICE DISPATCHER` post is injected into the relevant zone's comment board

### 6. 🔔 Citizen Notification Center
A comprehensive notification system for receiving real-time safety alerts from the admin:

- **Bell Icon + Badge**: Topbar notification bell with animated unread count badge
- **Sliding Glass Drawer**: A full-height side panel slides in with four filter tabs:
  - **All** — shows all notifications
  - **Unread** — shows only unseen alerts
  - **Zone Alerts** — police-dispatched targeted warnings only
  - **System** — system-generated status messages
- **Notification Cards**: Each card shows:
  - Severity color dot (🔴 High, 🟠 Medium, 🟢 Low)
  - Alert type title and timestamp
  - Full message body
  - Zone and severity metadata
  - ✓ **Mark as Read** button
  - 🗺️ **Locate** button — flies the map to the incident location with a pulsing wave circle

### 7. 🚨 High-Severity Alert Response System
When a **High severity** alert is dispatched from the Admin:

- **🔴 Fullscreen Flash Overlay**: A bright red semi-transparent overlay flashes over the entire screen **three times** — impossible to miss
- **🔊 Cyberpunk Audio Siren**: A synthesized three-beep warning siren plays using the Web Audio API — sawtooth oscillators with volume envelopes (880Hz → 880Hz → 1100Hz sequence)
- **Audio Autoplay Unlocker**: An interaction listener (`click`, `keydown`, `touchstart`) automatically unlocks the browser's audio context on first user interaction, ensuring alarms always play reliably
- **📢 Topbar Banner**: A persistent `🚨 CRITICAL DISPATCH` red warning banner mounts at the top of the page with direct click-to-locate map action

### 8. ⚠️ Broadcast Warning Overlay
When Admin dispatches a tactical broadcast alert:

- A full-page **glassmorphic warning overlay** appears with:
  - Alert type and zone name
  - Risk level badge
  - Full admin description message
- **Acknowledge Button**: Citizen can dismiss the overlay once they have read the warning

### 9. 💡 Citizen Feedback & Suggestion Portal
A floating feedback widget for citizens to improve the platform:

- **Floating Button**: Fixed bottom-left `💡` badge button always visible
- **Category**: UI/UX, New Feature, Bug Report, Data Accuracy
- **Priority**: Low / Medium / High pill selectors
- **Description**: Free-text suggestion input
- **Submission**: POSTs suggestion to the HTTP bridge so the Admin dashboard receives it in real-time
- **History Drawer**: View all past submissions in a scrollable, reverse-chronological list

---

## 📡 Real-Time Cross-Dashboard Sync Engine

The core innovation of this platform — a **self-healing Python HTTP API Bridge** that enables true real-time communication between the Admin and Citizen dashboards despite running on different ports (different browser origins).

### Why a Custom Bridge?
- `localStorage` is **partitioned by port** in browsers — `localhost:8601` and `localhost:8602` each have completely isolated storage
- Streamlit's `components.html()` renders inside **sandboxed iframes** — overriding `window.parent.localStorage` fails due to iframe opaque origins
- HTML5 `storage` events **never fire cross-origin**

### How It Works

```
Admin Dashboard (8601) ─────────────────┐
                                        ↓
                              HTTP Bridge API (8588)
                              POST/GET /api/state
                              Thread-Safe JSON File
                              trinetra_shared_state.json
                                        ↑
Citizen Portal (8602) ──────────────────┘
```

1. **Either dashboard** starts and tries to bind `ThreadedHTTPServer` on port `8588`
2. The **first** app to start successfully binds — logs `"Bridge server started on port 8588"`
3. The **second** app detects port collision (`OSError`) and gracefully skips — logs `"Bridge already running"`
4. **Both frontends** fetch `http://localhost:8588/api/state` every 2 seconds
5. Changes posted by Admin (zones, alerts, notifications) are returned to the Citizen within **≤2 seconds**

### Shared State Schema
```json
{
  "zones":         [...],   // Crime zone objects with lat/lon/risk
  "broadcasts":    [...],   // Admin broadcast alert payloads
  "notifications": [...],   // Push notification cards for citizens
  "users":         [...],   // Registered citizens with live GPS coords
  "suggestions":   [...]    // Citizen feedback submissions
}
```

### Sync Events Summary

| Admin Action | Bridge Update | Citizen Response |
|---|---|---|
| Add new zone | `POST zones` | Map marker appears, nearby toast fires |
| Delete zone | `POST zones` | Marker removed, safety score recalculated |
| Send Zone Alert | `POST broadcasts + notifications` | Screen flash + siren + banner + notification card |
| Dispatch Crime Wizard | `POST broadcasts + notifications` | Same as above |
| Drill-Down Tactical Alert | `POST broadcasts + notifications` | Same as above |
| Citizen logs in + GPS update | `POST users` | Admin sees live user locations for targeting |
| Citizen submits suggestion | `POST suggestions` | Admin sees updated suggestion count |

---

## 🤖 Machine Learning Pipeline (src/)

### XGBoost Crime Risk Classifier (`train_model.py`, `predict.py`)
- **Model**: Gradient Boosted Decision Trees (XGBoost)
- **Features**: Hour of day, day of week, month, latitude zone bucket, longitude zone bucket
- **Target**: Risk Level — `0` (Low), `1` (Medium), `2` (High)
- **Dataset**: Chicago Open Data Portal (auto-downloaded, 100K records)
- **Output**: `model.pkl` saved to project root

```python
from src.predict import predict_zone_risk
zones = predict_zone_risk(hour=22, day_of_week=4, month=6)
print(zones.head())
```

### LSTM Time-Series Forecaster (`lstm_forecaster.py`)
- **Architecture**: Long Short-Term Memory neural network (TensorFlow/Keras)
- **Task**: Forecasts daily crime incident counts for the next N days
- **Input**: Historical daily crime counts time series
- **Output**: 7-day forward prediction displayed in the Admin Analytics chart

```python
from src.lstm_forecaster import train_lstm, forecast_next_days
train_lstm()
forecast_next_days(n_days=7)
```

### spaCy NLP Report Extractor (`nlp_extractor.py`)
- **Model**: `en_core_web_sm` spaCy pipeline
- **Task**: Extracts structured entities from unstructured police report text
- **Extracts**: Crime type, severity, location entities, suspect descriptors, time references

```python
from src.nlp_extractor import extract_crime_info
result = extract_crime_info("Robbery on Michigan Avenue at 11pm. Suspect was armed.")
# { crime_type: 'Robbery', severity: 'High', locations: ['Michigan Avenue'], ... }
```

### Folium Heatmap Builder (`map_builder.py`)
- Generates standalone interactive HTML heatmap files
- Color-coded risk overlay exportable to any browser

```python
from src.map_builder import build_map
build_map(hour=22, day_of_week=4, output_path="crime_map.html")
```

---

## 🗺️ Monitored Zones — Vadodara / Parul University

| ID | Zone Name | Risk | Lat | Lon |
|----|-----------|------|-----|-----|
| Z01 | Parul Campus Central | 🟠 Medium | 22.2925 | 73.3639 |
| Z02 | Limda Village | 🔴 High | 22.2905 | 73.3695 |
| Z03 | Waghodia Crossing | 🔴 High | 22.2950 | 73.3450 |
| Z04 | Parul Hospital Zone | 🟠 Medium | 22.2965 | 73.3590 |
| Z05 | Amrapali Township | 🟢 Low | 22.2855 | 73.3510 |
| Z06 | Mastana Chowk Hub | 🟢 Low | 22.2935 | 73.3690 |
| Z07 | C V Raman Block | 🟠 Medium | 22.2919 | 73.3632 |

> **Note:** Admin can add or remove zones dynamically at runtime — changes sync to citizens in real-time.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web Server** | Python · Streamlit 1.27 |
| **Frontend UI** | Vanilla HTML5 · CSS3 · JavaScript (ES6+) |
| **Map Engine** | Leaflet.js 1.9.4 |
| **Charts** | Chart.js |
| **AI / NLP** | Google Gemini 1.5 Flash API |
| **ML Classifier** | XGBoost 1.7.6 |
| **Time Series** | TensorFlow 2.13 / Keras LSTM |
| **NLP Pipeline** | spaCy 3.6.1 (`en_core_web_sm`) |
| **Static Maps** | Folium 0.14 |
| **Data Processing** | Pandas 2.1 · NumPy 1.25 · Scikit-learn 1.3 |
| **HTTP Bridge** | Python `http.server.ThreadingMixIn` + `threading.Lock` |
| **Audio** | Web Audio API (AudioContext + OscillatorNode) |
| **PDF Export** | Browser Print API + html2canvas + jsPDF |
| **Design** | Glassmorphism · Cyberpunk dark theme · Google Fonts (Inter, JetBrains Mono) |

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `app/dashboard.py` | Streamlit server for Admin. Launches HTTP bridge on port 8588 |
| `app/dashboard.html` | Complete Admin UI — 5 tabs: Overview, Map, Analytics, NLP, Alerts |
| `app/script.js` | Admin JavaScript — map, charts, bridge polling, alert dispatch |
| `app/style.css` | Admin dark cyberpunk CSS theme with animations |
| `user/portal.py` | Streamlit server for Citizens. Self-heals bridge on port 8588 |
| `user/portal.html` | Complete Citizen UI — map, GPS, notifications, comments, reporter |
| `user/script.js` | Citizen JavaScript — GPS, polling, audio alerts, bridge sync |
| `user/style.css` | Citizen glassmorphic dark CSS theme |
| `app/trinetra_shared_state.json` | Auto-generated shared state file — do NOT edit manually |

---

## 🔒 Security Notes

> [!WARNING]
> The frontend JavaScript files contain a Google Gemini API key for NLP analysis. Before pushing this project to a **public** GitHub repository, either:
> - Replace the key with an environment variable, **or**
> - Keep the repository **Private**

---

## 🚀 Deployment Tips

- **Both apps must be running simultaneously** for real-time sync to work
- The HTTP bridge (port 8588) starts automatically — no manual action needed
- If you restart only one app, the bridge stays alive as long as the other app is running
- To fully reset the shared state, delete `app/trinetra_shared_state.json`

---

## 📄 License

MIT License — Free to use for academic, personal, and research projects.

---

<div align="center">
  <strong>Built with ❤️ for Vadodara City Safety</strong><br/>
  Parul University · TRINETRA AI · 2025
</div>
