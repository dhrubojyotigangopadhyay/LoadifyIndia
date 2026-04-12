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

// --- FUTURE LOGIC PLACEHOLDERS (DO NOT REMOVE) ---

// 2. AUTH: SUPABASE MOBILE OTP (Placeholder for later activation)
app.post("/auth/otp", async (req, res) => {
    try {
        const { phone } = req.body;
        // Logic for supabase.auth.signInWithOtp({ phone }) goes here
        res.status(200).json({ success: true, message: "OTP pipeline ready" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. PAYMENT: UPI/RAZORPAY INTEGRATION (Placeholder for later activation)
app.post("/payment/create", async (req, res) => {
    try {
        const { amount, truck_id } = req.body;
        // Logic for UPI intent or Razorpay Order ID goes here
        res.status(200).json({ success: true, order_id: "UPI_TEMP_12345" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- CORE TRACKING LOGIC ---

// 4. START TRIP
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

// 5. SEND LOCATION (MAIN TRACKING)
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

// 6. END TRIP
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

// 7. DASHBOARD FETCH (OWNER VIEW)
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

// 8. ON-DEMAND AI INSIGHTS (GEMINI 1.5 FLASH)
app.post("/generate-summary", async (req, res) => {
    try {
        const { truck_id } = req.body;
        const { data } = await supabase.from("locations")
            .select("lat, lng, speed, timestamp")
            .eq("truck_id", truck_id)
            .order("timestamp", { ascending: false })
            .limit(20); // Analyzing last 20 points for patterns

        const prompt = `You are Loadify AI Advisor. Analyze this movement data for Truck ${truck_id}: ${JSON.stringify(data)}. 
        Provide a 12-word professional status report on route efficiency and driver behavior.`;
        
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );
        
        const insight = response.data.candidates[0].content.parts[0].text;
        res.json({ insight });
    } catch (e) {
        res.json({ insight: "AI Analysis ready. Click to generate report." });
    }
});

app.listen(PORT, () => console.log(`Loadify India running on ${PORT}`));
