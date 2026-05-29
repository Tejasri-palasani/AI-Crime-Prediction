import streamlit as st
import streamlit.components.v1 as components
import os
import http.server
import socketserver
import json
import threading

# Use same file location relative to app/ to ensure they share the same physical JSON file
STATE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "trinetra_shared_state.json")

def load_shared_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "zones": None,
        "broadcasts": [],
        "notifications": [],
        "users": [],
        "suggestions": []
    }

def save_shared_state(state):
    try:
        # Create directories if they don't exist
        os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception:
        pass

# Global lock to protect state file access
state_lock = threading.Lock()

class BridgeHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/state":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            with state_lock:
                state = load_shared_state()
            self.wfile.write(json.dumps(state).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/state":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body)
            except Exception:
                self.send_response(400)
                self.end_headers()
                return

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()

            with state_lock:
                state = load_shared_state()
                if "zones" in data and data["zones"] is not None:
                    state["zones"] = data["zones"]
                if "broadcasts" in data:
                    state["broadcasts"] = data["broadcasts"]
                if "notifications" in data:
                    state["notifications"] = data["notifications"]
                if "users" in data:
                    state["users"] = data["users"]
                if "suggestions" in data:
                    state["suggestions"] = data["suggestions"]
                save_shared_state(state)

            self.wfile.write(json.dumps({"status": "success", "state": state}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True

def start_bridge_server():
    try:
        server = ThreadedHTTPServer(("localhost", 8588), BridgeHTTPRequestHandler)
        t = threading.Thread(target=server.serve_forever, daemon=True)
        t.start()
        print("[TRINETRA] Bridge server successfully started on port 8588.")
    except OSError:
        # Port already in use, meaning the other app already spun it up
        print("[TRINETRA] Bridge server is already running on port 8588. Skipping start.")
    except Exception as e:
        print("[TRINETRA] Error starting bridge server:", e)

# Spin up the bridge server in a background thread
start_bridge_server()

import base64

st.set_page_config(
    page_title="TRINETRA Citizen Portal",
    page_icon="🟢",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Hide all streamlit chrome
st.markdown("""
<style>
#MainMenu, header, footer, [data-testid="stToolbar"],
[data-testid="stDecoration"], [data-testid="stStatusWidget"] { display:none!important; }
.block-container { padding:0!important; margin:0!important; max-width:100%!important; }
html,body,[data-testid="stAppViewContainer"],[data-testid="stApp"] {
    background:#000!important; overflow:hidden!important;
}
</style>
""", unsafe_allow_html=True)

def load_file(filename):
    filepath = os.path.join(os.path.dirname(__file__), filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    return ""

def load_image_b64(filename):
    filepath = os.path.join(os.path.dirname(__file__), filename)
    if os.path.exists(filepath):
        with open(filepath, "rb") as f:
            return base64.b64encode(f.read()).decode()
    return ""

HTML_CONTENT = load_file("portal.html")
CSS_CONTENT = load_file("style.css")
JS_CONTENT = load_file("script.js")
LOGO_B64 = load_image_b64("logo.png")

FULL_HTML = f"""
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>TRINETRA Citizen Portal</title>
<!-- Include Leaflet CSS and JS for map -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<!-- Include Chart.js for charts -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>
{CSS_CONTENT}
</style>
<script>
window.LOGO_B64 = "data:image/png;base64,{LOGO_B64}";
</script>
</head>
<body>
{HTML_CONTENT}
<script>
{JS_CONTENT}
</script>
</body>
</html>
"""

components.html(FULL_HTML, height=800, scrolling=False)
