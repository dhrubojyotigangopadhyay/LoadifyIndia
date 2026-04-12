// --- CONFIGURATION ---
const API_BASE = "https://loadifyindia.onrender.com";
let currentView = 'login';
let truckMap = null;
let isTracking = false;

// --- GATEWAY LOGIN ---
function handleGatewayLogin() {
    const phone = document.getElementById('user-phone').value;
    const gateway = document.getElementById('login-gateway');

    if (phone === "9874076688") {
        gateway.style.display = 'none';
        document.getElementById('owner-dashboard').style.display = 'flex';
        initOwnerDashboard();
    } else if (phone.length >= 10) {
        gateway.style.display = 'none';
        document.getElementById('driver-console').style.display = 'flex';
    } else {
        document.getElementById('error-msg').innerText = "Invalid Access Code";
    }
}

// --- OWNER LOGIC ---
function initOwnerDashboard() {
    truckMap = L.map('map').setView([21.1458, 79.0882], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(truckMap);
    setInterval(refreshFleet, 10000);
    refreshFleet();
}

async function refreshFleet() {
    const res = await fetch(`${API_BASE}/dashboard`);
    const trucks = await res.json();
    document.getElementById('truck-count').innerText = trucks.length;
    const list = document.getElementById('truck-list');
    list.innerHTML = '';

    trucks.forEach(t => {
        const card = document.createElement('div');
        card.className = 'truck-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between">
                <strong>${t.truck_id}</strong>
                <span style="color:${t.speed > 5 ? '#4CAF50' : '#f44336'}">● ${t.status}</span>
            </div>
            <p style="font-size:0.8rem; color:#888; margin:5px 0">${t.speed} KM/H | Signal: ${t.signal}</p>
            <div id="ai-res-${t.truck_id}">
                <button class="ai-report-btn" onclick="askAI('${t.truck_id}')">✨ GENERATE AI INSIGHT</button>
            </div>
        `;
        list.appendChild(card);
    });
}

async function askAI(id) {
    const box = document.getElementById(`ai-res-${id}`);
    box.innerHTML = "<p style='font-size:0.7rem; color:#4CAF50'>AI Advisor is analyzing patterns...</p>";
    const res = await fetch(`${API_BASE}/generate-summary`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ truck_id: id })
    });
    const data = await res.json();
    box.innerHTML = `<p style='font-size:0.8rem; color:#4CAF50; border:1px dashed #4CAF50; padding:10px; border-radius:5px'>🤖 ${data.insight}</p>`;
}

// --- DRIVER LOGIC ---
function toggleDriverTrip() {
    const btn = document.getElementById('main-trip-btn');
    const ind = document.getElementById('trip-indicator');
    isTracking = !isTracking;

    if (isTracking) {
        btn.innerText = "FINISH TRIP";
        btn.style.background = "#f44336";
        ind.innerText = "LIVE TRACKING ACTIVE";
        ind.className = "pulse-online";
        startGpsStream();
    } else {
        location.reload(); // Hard stop for safety
    }
}

function startGpsStream() {
    navigator.geolocation.watchPosition(pos => {
        fetch(`${API_BASE}/send-location`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                truck_id: "WB26-X0606",
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                speed: pos.coords.speed || 0
            })
        });
    }, null, { enableHighAccuracy: true });
}
