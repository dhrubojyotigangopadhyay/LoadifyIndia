const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// 1. HEALTH CHECK (Wakes up the server)
app.get("/", (req, res) => {
    res.send("Loadify India API v1.2 Live | Pilot Network Active");
});

// --- FUTURE PIPELINES (DO NOT REMOVE) ---

// 2. AUTH: SUPABASE MOBILE OTP 
app.post("/auth/otp", async (req, res) => {
    try {
        const { phone } = req.body;
        res.status(200).json({ success: true, message: "OTP pipeline ready" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. PAYMENT: UPI/RAZORPAY INTEGRATION
app.post("/payment/create", async (req, res) => {
    try {
        const { amount, truck_id } = req.body;
        res.status(200).json({ success: true, order_id: "UPI_TEMP_12345" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- CORE LOGISTICS ENGINE ---

// 4. START TRIP (Pilot engages engine)
app.post("/start-trip", async (req, res) => {
    try {
        const { truck_id } = req.body;
        const { data, error } = await supabase.from("trips").insert([
            { truck_id, start_time: new Date().toISOString() }
        ]).select();
        if (error) throw error;
        res.status(200).json({ success: true, trip: data[0] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 5. SEND LOCATION (Main GPS Stream)
app.post("/send-location", async (req, res) => {
    try {
        const { truck_id, lat, lng, speed } = req.body;
        const { error } = await supabase.from("locations").insert([
            {
                truck_id: String(truck_id),
                lat: Number(lat),
                lng: Number(lng),
                speed: Number(speed || 0),
                timestamp: new Date().toISOString()
            }
        ]);
        if (error) throw error;
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. OWNER DASHBOARD DATA (Real-time Filtered)
app.get("/dashboard", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("locations")
            .select("*")
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

// 7. DYNAMIC DEEP AI AUDIT (0-30 DAYS)
app.post("/generate-deep-report", async (req, res) => {
    try {
        const { truck_id, days } = req.body;
        const rangeDate = new Date();
        rangeDate.setDate(rangeDate.getDate() - (parseInt(days) || 7));

        const { data: logs, error } = await supabase.from("locations")
            .select("lat, lng, speed, timestamp")
            .eq("truck_id", truck_id)
            .gte("timestamp", rangeDate.toISOString())
            .order("timestamp", { ascending: false });

        if (error || !logs.length) throw new Error("No logs found for this period");

        const prompt = `You are the Loadify India AI Fleet Auditor. 
        Analyze ${days} days of logs for Truck ${truck_id}: ${JSON.stringify(logs)}. 
        Current Date: April 13, 2026.
        Report on: 
        1. Operational Efficiency (Dhaba/Border/RTO delays).
        2. Pilot Safety Grade (A-F) based on speed patterns.
        3. Strategic Tips for the Owner to save fuel/time on Indian highways.
        Use 50 words max, professional Indian business style.`;
        
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );
        
        const insight = response.data.candidates[0].content.parts[0].text;
        res.json({ insight });
    } catch (e) {
        res.json({ insight: "AI Analysis ready. Scan logs first to generate verdict." });
    }
});

// 8. END TRIP
app.post("/end-trip", async (req, res) => {
    try {
        const { trip_id } = req.body;
        const { error } = await supabase.from("trips")
            .update({ end_time: new Date().toISOString() })
            .eq("id", trip_id);
        if (error) throw error;
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => console.log(`Loadify Engine LIVE on port ${PORT}`));
