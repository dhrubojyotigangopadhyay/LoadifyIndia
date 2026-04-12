const map = L.map('map').setView([21.1458, 79.0882], 5);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

let markers = {};

async function updateMap() {
    try {
        const res = await fetch('https://loadifyindia.onrender.com/dashboard');
        const trucks = await res.json();
        document.getElementById('truck-count').innerText = trucks.length;
        
        const list = document.getElementById('truck-list');
        list.innerHTML = '';

        trucks.forEach(truck => {
            const { truck_id, lat, lng, speed, status } = truck;

            if (!markers[truck_id]) {
                markers[truck_id] = L.marker([lat, lng]).addTo(map).bindPopup(truck_id);
            } else {
                markers[truck_id].setLatLng([lat, lng]);
            }

            const card = document.createElement('div');
            card.className = `truck-card ${status === 'Stopped' ? 'stopped' : ''}`;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between">
                    <h4>${truck_id}</h4> <span class="status-dot"></span>
                </div>
                <p>Speed: ${speed} km/h | Status: ${status}</p>
                <div class="ai-insight" id="ai-${truck_id}">✨ AI Analysis: Fetching patterns...</div>
            `;
            list.appendChild(card);
            fetchAI(truck_id);
        });
    } catch (e) { console.log("Sync Error"); }
}

async function fetchAI(id) {
    const aiBox = document.getElementById(`ai-${id}`);
    try {
        const res = await fetch('https://loadifyindia.onrender.com/generate-summary', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ truck_id: id })
        });
        const data = await res.json();
        aiBox.innerText = `🤖 AI: ${data.insight}`;
    } catch (e) { aiBox.innerText = "AI checking route..."; }
}

setInterval(updateMap, 10000);
updateMap();
