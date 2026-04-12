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

// --- CORE LOGIC START ---

// 1. HEALTH CHECK
app.get("/", (req, res) => {
    res.send("Loadify API v1.0 Live");
});

// 2. START TRIP (Step 3: API 1)
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

// 3. SEND LOCATION (Step 3: API 2 - MAIN TRACKING)
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

// 4. END TRIP (Step 3: API 3)
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

// 5. OWNER DASHBOARD (Step 8)
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
                latest[row.truck_id] = { ...row, status: row.speed < 5 ? "Stopped" : "Moving" };
            }
        });
        res.json(Object.values(latest));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. AI INSIGHTS (Step 9)
app.post("/generate-summary", async (req, res) => {
    try {
        const { truck_id } = req.body;
        const { data } = await supabase.from("locations")
            .select("*").eq("truck_id", truck_id)
            .order("timestamp", { ascending: false }).limit(10);

        const prompt = `Truck ${truck_id} data: ${JSON.stringify(data)}. Summarize status in 10 words.`;
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );
        res.json({ insight: response.data.candidates[0].content.parts[0].text });
    } catch (e) {
        res.json({ insight: "AI Analysis unavailable" });
    }
});

app.listen(PORT, () => console.log(`Loadify running on ${PORT}`));
