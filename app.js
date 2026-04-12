let selectedRole = null;
let activeTruckId = null;
const API = "https://loadifyindia.onrender.com";
let map, isTracking = false;

function setRole(role) {
    selectedRole = role;
    document.getElementById('selected-role-text').innerText = "Role Selected: " + role.toUpperCase();
}

function appLogin() {
    const phone = document.getElementById('login-phone').value;
    if (!phone || !selectedRole) return alert("Select Role and Put Number");

    if (selectedRole === 'owner' && phone === "9874076688") {
        document.getElementById('gateway').classList.add('hidden');
        document.getElementById('owner-view').classList.remove('hidden');
        initOwner();
    } else if (selectedRole === 'driver') {
        document.getElementById('gateway').classList.add('hidden');
        document.getElementById('driver-view').classList.remove('hidden');
    } else {
        alert("Access Denied");
    }
}

function initOwner() {
    map = L.map('map').setView([22.5, 88.3], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    setInterval(updateDashboard, 5000);
    updateDashboard();
}

async function updateDashboard() {
    const res = await fetch(`${API}/dashboard`);
    const data = await res.json();
    const list = document.getElementById('fleet-list');
    list.innerHTML = '';
    data.forEach(t => {
        const div = document.createElement('div');
        div.style = "padding:10px; border-bottom:1px solid #ccc; cursor:pointer;";
        div.innerText = t.truck_id + " (" + t.status + ")";
        div.onclick = () => {
            activeTruckId = t.truck_id;
            document.getElementById('live-speed').innerText = t.speed + " KM/H";
            document.getElementById('live-signal').innerText = t.signal;
            document.getElementById('live-time').innerText = new Date(t.timestamp).toLocaleTimeString();
            map.setView([t.lat, t.lng], 12);
            // Simple Graph bars
            const g = document.getElementById('graph-bars');
            g.innerHTML = '';
            for(let i=0; i<15; i++) {
                g.innerHTML += `<div style="flex:1; background:blue; height:${Math.random()*100}px"></div>`;
            }
        };
        list.appendChild(div);
    });
}

async function triggerDeepAudit() {
    if (!activeTruckId) return alert("Select a truck from the list");
    const days = document.getElementById('audit-range').value;
    const output = document.getElementById('ai-output');
    output.innerText = "AI Brain is calculating for " + days + " days...";

    const res = await fetch(`${API}/generate-deep-report`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ truck_id: activeTruckId, days: parseInt(days) })
    });
    const data = await res.json();
    output.innerText = data.insight;
}

function handleTrip() {
    const btn = document.getElementById('trip-btn');
    isTracking = !isTracking;
    if (isTracking) {
        btn.innerText = "STOP TRIP";
        btn.style.background = "red";
        document.getElementById('gps-status').innerText = "GPS: STREAMING";
        navigator.geolocation.watchPosition(pos => {
            fetch(`${API}/send-location`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    truck_id: "WB26-X0606",
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    speed: pos.coords.speed || 0
                })
            });
        });
    } else {
        location.reload();
    }
}
