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

// 1. HEALTH CHECK
app.get("/", (req, res) => {
    res.send("Loadify India API v1.1 Live");
});

// 2. START TRIP
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

// 3. SEND LOCATION
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

// 4. END TRIP
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

// 5. DASHBOARD FETCH (Includes Insight logic)
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
                    status: row.speed < 5 ? "Stopped" : "Moving",
                    signal: diff > 20 ? "Lost" : "Active"
                };
            }
        });
        res.json(Object.values(latest));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. STUNNING AI INSIGHTS (Gemini 1.5 Flash)
app.post("/generate-summary", async (req, res) => {
    try {
        const { truck_id } = req.body;
        const { data } = await supabase.from("locations")
            .select("lat, lng, speed, timestamp")
            .eq("truck_id", truck_id)
            .order("timestamp", { ascending: false })
            .limit(15);

        const prompt = `You are Loadify AI. Analyze this Indian truck data: ${JSON.stringify(data)}. Give a 10-word status report on safety and efficiency.`;
        
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );
        
        const insight = response.data.candidates[0].content.parts[0].text;
        res.json({ insight });
    } catch (e) {
        res.json({ insight: "AI Assistant is analyzing..." });
    }
});

app.listen(PORT, () => console.log(`Loadify India running on ${PORT}`));
