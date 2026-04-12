// 1. Initialize Map centered on Central India (Nagpur region)
const map = L.map('map').setView([21.1458, 79.0882], 5);

// 2. Load Professional Dark Tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OSM © CARTO',
    maxZoom: 18,
    minZoom: 4
}).addTo(map);

let markers = {};

// 3. FETCH LIVE DATA (Step 6)
async function refreshDashboard() {
    try {
        const response = await fetch('https://loadifyindia.onrender.com/dashboard');
        const trucks = await response.json();

        document.getElementById('truck-count').innerText = trucks.length;
        const list = document.getElementById('truck-list');
        list.innerHTML = '';

        trucks.forEach(truck => {
            const { truck_id, lat, lng, speed, status } = truck;

            // Update Map Marker
            if (markers[truck_id]) {
                markers[truck_id].setLatLng([lat, lng]);
            } else {
                markers[truck_id] = L.marker([lat, lng]).addTo(map)
                    .bindPopup(`<b>${truck_id}</b><br>${speed} km/h`);
            }

            // Update Sidebar Card
            const card = document.createElement('div');
            card.className = `truck-card ${status === 'Stopped' ? 'stopped' : ''}`;
            card.innerHTML = `
                <h4>${truck_id}</h4>
                <p>Status: ${status} | <span class="speed-val">${speed} km/h</span></p>
            `;
            card.onclick = () => {
                map.flyTo([lat, lng], 13);
                markers[truck_id].openPopup();
            };
            list.appendChild(card);
        });
    } catch (e) { console.log("Sync Error:", e); }
}

// 4. REGISTER & INVITE (Step 2 & 3)
async function registerTruck() {
    const truck_number = document.getElementById('truck-no').value;
    const driver_phone = document.getElementById('driver-ph').value;

    if (!truck_number || !driver_phone) return alert("Fill all fields");

    try {
        const res = await fetch('https://loadifyindia.onrender.com/add-truck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ truck_number, driver_phone, owner_phone: "9874076688" })
        });

        if (res.ok) {
            const msg = `Install Loadify to start Truck ${truck_number}: https://loadifyindia.onrender.com/start`;
            window.open(`https://wa.me/91${driver_phone}?text=${encodeURIComponent(msg)}`, '_blank');
        }
    } catch (e) { alert("Registration Failed"); }
}

setInterval(refreshDashboard, 10000); // 10-sec update
refreshDashboard();
