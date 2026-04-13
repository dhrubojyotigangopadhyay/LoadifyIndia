const API = "https://loadifyindia.onrender.com";
let selectedRole = 'owner';
let mapInstance = null;
let isTracking = false;

// 1. GATEWAY & NAVIGATION
function setRole(r) {
    selectedRole = r;
    document.getElementById('role-owner').className = r === 'owner' ? "flex-1 p-4 rounded-xl border-2 font-bold bg-blue-800 text-white border-blue-800" : "flex-1 p-4 rounded-xl border-2 font-bold bg-gray-50 text-gray-500 border-gray-200";
    document.getElementById('role-driver').className = r === 'driver' ? "flex-1 p-4 rounded-xl border-2 font-bold bg-blue-800 text-white border-blue-800" : "flex-1 p-4 rounded-xl border-2 font-bold bg-gray-50 text-gray-500 border-gray-200";
}

async function processLogin() {
    const phone = document.getElementById('login-phone').value;
    if (!phone) return alert("Enter Mobile Number");

    if (selectedRole === 'driver') {
        showScreen('driver');
    } else {
        try {
            const res = await fetch(`${API}/dashboard`);
            const data = await res.json();
            if (data.length === 0) showScreen('onboarding');
            else { showScreen('owner'); initOwnerMap(); }
        } catch (e) { showScreen('onboarding'); }
    }
}

function showScreen(id) {
    const screens = ['screen-login', 'screen-owner', 'screen-driver', 'screen-onboarding'];
    screens.forEach(s => document.getElementById(s).style.display = 'none');
    document.getElementById('screen-' + id).style.display = 'flex';
    if(id === 'screen-driver' || id === 'screen-onboarding') document.getElementById('screen-' + id).style.flexDirection = 'column';
}

// 2. PILOT ONBOARDING
function sendWhatsAppInvite() {
    const truck = document.getElementById('new-truck-id').value;
    const pPhone = document.getElementById('new-pilot-phone').value;
    if(!truck || !pPhone) return alert("Fill Truck No and Pilot Mobile");
    const msg = `Loadify India: You are assigned as the Pilot for Truck ${truck}. Install app: ${window.location.href}`;
    window.open(`https://wa.me/91${pPhone}?text=${encodeURIComponent(msg)}`);
}

function saveAndGoToDash() {
    alert("Pilot Registered Successfully!");
    showScreen('owner');
    initOwnerMap();
}

// 3. OWNER DASHBOARD
function initOwnerMap() {
    if(!mapInstance) {
        mapInstance = L.map('map-mobile', {zoomControl: false}).setView([22.5, 88.3], 6);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(mapInstance);
    }
    refreshFleet();
    setInterval(refreshFleet, 10000);
}

async function refreshFleet() {
    const res = await fetch(`${API}/dashboard`);
    const data = await res.json();
    const container = document.getElementById('truck-cards-container');
    container.innerHTML = '';
    
    data.forEach(t => {
        container.innerHTML += `
            <div class="bg-white p-5 rounded-[30px] border shadow-sm mb-4" onclick="focusTruck(${t.lat}, ${t.lng})">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-black text-xl text-blue-900">${t.truck_id}</h4>
                        <p class="text-xs font-bold ${t.status === 'Moving' ? 'text-green-600' : 'text-red-600'}">● ${t.status}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="location.href='tel:9874076688'" class="bg-gray-100 p-3 rounded-2xl font-bold text-xs">📞 CALL</button>
                        <button onclick="location.href='sms:9874076688'" class="bg-gray-100 p-3 rounded-2xl font-bold text-xs">✉️ MSG</button>
                    </div>
                </div>
                <div class="flex justify-between text-sm mt-4 font-bold text-gray-400">
                    <span>📍 Speed: ${t.speed} KM/H</span>
                    <span class="text-blue-900 text-lg">₹12,000 trip</span>
                </div>
            </div>`;
    });
}

function focusTruck(lat, lng) { mapInstance.setView([lat, lng], 14); }

// 4. PILOT TRACKING
function toggleTrip() {
    const btn = document.getElementById('main-trip-btn');
    isTracking = !isTracking;
    if (isTracking) {
        btn.innerText = "FINISH TRIP";
        btn.classList.replace('bg-blue-800', 'bg-red-600');
        startGpsStream();
    } else { location.reload(); }
}

function startGpsStream() {
    navigator.geolocation.watchPosition(pos => {
        fetch(`${API}/send-location`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                truck_id: "WB26-X0606",
                lat: pos.coords.latitude, lng: pos.coords.longitude,
                speed: pos.coords.speed || 0
            })
        });
    }, null, { enableHighAccuracy: true });
}
