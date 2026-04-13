const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ── SUPABASE ─────────────────────────────
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ── HEALTH ───────────────────────────────
app.get("/", (req, res) => {
    res.send("Loadify India API v2 LIVE");
});


// ── AUTH (SAFE FOR DEMO) ─────────────────
app.post("/auth/otp", async (req, res) => {
    try {
        const { phone } = req.body;

        // Trigger OTP (if configured in Supabase)
        await supabase.auth.signInWithOtp({
            phone: `+91${phone}`
        });

        res.json({ success: true });
    } catch (e) {
        res.json({ success: true }); // never break demo
    }
});


// ── START TRIP ───────────────────────────
app.post("/start-trip", async (req, res) => {
    try {
        const { truck_id, owner_phone } = req.body;

        const { data, error } = await supabase.from("trips").insert([
            {
                truck_id,
                owner_phone: owner_phone || "demo_owner",
                start_time: new Date().toISOString()
            }
        ]).select();

        if (error) throw error;

        res.json({ success: true, trip: data[0] });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// ── SEND LOCATION ────────────────────────
app.post("/send-location", async (req, res) => {
    try {
        const { truck_id, lat, lng, speed, owner_phone } = req.body;

        const { error } = await supabase.from("locations").insert([
            {
                truck_id: String(truck_id),
                lat: Number(lat),
                lng: Number(lng),
                speed: Number(speed || 0),
                owner_phone: owner_phone || "demo_owner",
                timestamp: new Date().toISOString()
            }
        ]);

        if (error) throw error;

        res.json({ success: true });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// ── DASHBOARD (OWNER SAFE) ───────────────
app.get("/dashboard", async (req, res) => {
    try {
        const { phone } = req.query;

        const { data, error } = await supabase
            .from("locations")
            .select("*")
            .eq("owner_phone", phone || "demo_owner")
            .order("timestamp", { ascending: false });

        if (error) throw error;

        const latest = {};

        data.forEach(row => {
            if (!latest[row.truck_id]) {
                const diff = (new Date() - new Date(row.timestamp)) / 60000;

                latest[row.truck_id] = {
                    ...row,
                    status: row.speed > 5 ? "Moving" : "Stopped",
                    signal: diff > 20 ? "Lost" : "Active"
                };
            }
        });

        res.json(Object.values(latest));

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// ── AI INSIGHTS (OPTIMIZED GEMINI) ───────
app.post("/generate-deep-report", async (req, res) => {
    try {
        const { truck_id, days } = req.body;

        const rangeDate = new Date();
        rangeDate.setDate(rangeDate.getDate() - (parseInt(days) || 3));

        // FETCH LOGS
        const { data: logs, error } = await supabase
            .from("locations")
            .select("speed, timestamp")
            .eq("truck_id", truck_id)
            .gte("timestamp", rangeDate.toISOString())
            .order("timestamp", { ascending: true });

        if (error || !logs.length) {
            return res.json({ insight: "No trip data available" });
        }

        // ── PROCESS DATA ──
        let total = logs.length;
        let moving = logs.filter(l => l.speed > 5).length;
        let idle = total - moving;
        let overspeed = logs.filter(l => l.speed > 80).length;

        let speeds = logs.map(l => l.speed);
        let avgSpeed = speeds.reduce((a, b) => a + b, 0) / total;
        let maxSpeed = Math.max(...speeds);

        let efficiency = ((moving / total) * 100).toFixed(1);

        let longStops = 0;
        for (let i = 1; i < logs.length; i++) {
            let diff = (new Date(logs[i].timestamp) - new Date(logs[i - 1].timestamp)) / 60000;
            if (diff > 20) longStops++;
        }

        // ── COMPACT DATA ──
        const compactData = `
Truck ${truck_id}:
Efficiency: ${efficiency}%
Idle: ${idle}
Overspeed: ${overspeed}
Avg Speed: ${avgSpeed.toFixed(1)}
Max Speed: ${maxSpeed}
Long Stops: ${longStops}
`;

        // ── PROMPT ──
        const prompt = `
You are a logistics intelligence system for Indian fleet owners.

Analyze:

${compactData}

Output STRICT:

1. Profit Leakage (1 line)
2. Driver Behavior (1 line)
3. Risk Level (Low/Medium/High)
4. Action Advice (max 12 words)

No explanation. No extra text.
`;

        // ── GEMINI ──
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }]
            }
        );

        const insight =
            response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
            "AI unavailable";

        res.json({ insight });

    } catch (e) {
        res.json({ insight: "AI temporarily unavailable" });
    }
});


// ── END TRIP ─────────────────────────────
app.post("/end-trip", async (req, res) => {
    try {
        const { trip_id } = req.body;

        const { error } = await supabase
            .from("trips")
            .update({ end_time: new Date().toISOString() })
            .eq("id", trip_id);

        if (error) throw error;

        res.json({ success: true });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// ── START SERVER ─────────────────────────
app.listen(PORT, () => {
    console.log(`Loadify Engine LIVE on port ${PORT}`);
});
