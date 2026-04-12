// Updates the live telemetry panel when a truck is clicked
function selectTruck(truck) {
    activeTruckId = truck.truck_id;
    
    // 1. Update Speed Stat
    document.getElementById('live-speed').innerHTML = `${truck.speed} <span class="unit">KM/H</span>`;
    
    // 2. Update Signal Health (Pre-calculated in server)
    const signalBox = document.getElementById('signal-health');
    signalBox.innerText = truck.signal;
    signalBox.style.color = truck.signal === 'Active' ? '#4CAF50' : '#f44336';

    // 3. Update Map
    if (fleetMap) fleetMap.setView([truck.lat, truck.lng], 13);

    // 4. Generate visual bars for "Speed Intensity"
    const graph = document.getElementById('speed-bars');
    graph.innerHTML = '';
    // Mock 24h intensity bars
    for(let i=0; i<20; i++) {
        const height = Math.random() * 80 + 10;
        graph.innerHTML += `<div class="bar" style="height:${height}%"></div>`;
    }
}

async function triggerDeepAudit() {
    if (!activeTruckId) return alert("Select a truck first");
    const box = document.getElementById('ai-audit-output');
    const days = document.getElementById('audit-range').value;
    
    box.innerHTML = `<span style="color:#4CAF50">Scanning history logs (April 13 back to ${days} days)...</span>`;

    const res = await fetch(`${API_URL}/generate-deep-report`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ truck_id: activeTruckId, days: parseInt(days) })
    });
    const result = await res.json();
    box.innerHTML = `<div class="ai-verdict">${result.insight}</div>`;
}
