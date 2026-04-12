// 1. Initialize Map centered on India (Kolkata/Delhi region)
// View: [Lat, Lng], Zoom Level: 5 (covers most of India)
const map = L.map('map').setView([22.5726, 88.3639], 5);

// 2. Load Free Indian Tiles (Dark Mode)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OSM © CARTO',
    maxZoom: 19
}).addTo(map);

// 3. Store markers in an object so we can move them without flickering
let markers = {};

async function refreshMap() {
    try {
        // FETCH data from your Render Backend
        const response = await fetch('https://loadifyindia.onrender.com/dashboard');
        const trucks = await response.json();

        document.getElementById('truck-count').innerText = trucks.length;
        const list = document.getElementById('truck-list');
        list.innerHTML = ''; // Clear the list

        trucks.forEach(truck => {
            const { truck_id, lat, lng, speed, status } = truck;

            // A. UPDATE OR CREATE MARKER
            if (markers[truck_id]) {
                markers[truck_id].setLatLng([lat, lng]);
                markers[truck_id].getPopup().setContent(`<b>${truck_id}</b><br>${speed} km/h`);
            } else {
                markers[truck_id] = L.marker([lat, lng])
                    .addTo(map)
                    .bindPopup(`<b>${truck_id}</b><br>${speed} km/h`);
            }

            // B. UPDATE SIDEBAR CARD
            const card = document.createElement('div');
            card.className = `truck-card ${status === 'Stopped' ? 'stopped' : ''}`;
            card.innerHTML = `
                <h4>ID: ${truck_id}</h4>
                <p>Status: ${status}</p>
                <p>Live Speed: <span class="speed-tag">${speed} km/h</span></p>
            `;
            
            // Zoom map to truck on click
            card.onclick = () => {
                map.flyTo([lat, lng], 13);
                markers[truck_id].openPopup();
            };
            
            list.appendChild(card);
        });

    } catch (e) {
        console.log("Map Error:", e);
    }
}

// Sync data every 10 seconds
setInterval(refreshMap, 10000);
refreshMap(); // Run once on start
