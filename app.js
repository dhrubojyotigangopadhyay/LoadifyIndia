let activeId = null;
const API = "https://loadifyindia.onrender.com";

function selectTruck(t) {
    activeId = t.truck_id;
    document.getElementById('live-speed').innerHTML = `${t.speed} <small>KM/H</small>`;
    document.getElementById('signal-health').innerText = t.signal;
    document.getElementById('signal-health').style.color = t.signal === 'Active' ? '#4CAF50' : '#f44336';
    document.getElementById('last-ping').innerText = new Date(t.timestamp).toLocaleTimeString();
    
    // Update Map
    if (fleetMap) fleetMap.setView([t.lat, t.lng], 14);

    // Mock Trend
    const g = document.getElementById('speed-bars');
    g.innerHTML = '';
    for(let i=0; i<15; i++) {
        g.innerHTML += `<div class="bar" style="height:${Math.random()*80+10}%"></div>`;
    }
}

async function triggerDeepAudit() {
    if (!activeId) return alert("Select a truck");
    const box = document.getElementById('ai-audit-output');
    const days = document.getElementById('audit-range').value;
    box.innerHTML = `<span style="color:#4CAF50">Scanning April logs back ${days} days...</span>`;

    const res = await fetch(`${API}/generate-deep-report`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ truck_id: activeId, days: parseInt(days) })
    });
    const data = await res.json();
    box.innerHTML = `<div>${data.insight}</div>`;
}
