const express = require("express");
const cors = require("cors");
const supabaseLib = require("@supabase/supabase-js");
const axios = require("axios");

const createClient = supabaseLib.createClient;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_KEY,
{
auth: { persistSession: false }
}
);

app.get("/", (req, res) => {
res.send("Loadify backend running");
});

app.post("/send-location", async (req, res) => {
try {
const { truck_id, lat, lng, speed } = req.body;

```
if (!truck_id || lat === undefined || lng === undefined) {
  return res.status(400).json({ error: "Missing data" });
}

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

res.json({ success: true });
```

} catch (e) {
console.log("SEND LOCATION ERROR:", e);
res.status(500).json({ error: e.message });
}
});

app.get("/dashboard", async (req, res) => {
try {
const { data, error } = await supabase
.from("locations")
.select("*")
.order("timestamp", { ascending: false });

```
if (error) throw error;

const latest = {};

data.forEach((row) => {
  if (!latest[row.truck_id]) {
    latest[row.truck_id] = row;
  }
});

const result = Object.values(latest).map((r) => ({
  truck_id: r.truck_id,
  lat: r.lat,
  lng: r.lng,
  speed: r.speed,
  timestamp: r.timestamp,
  status: r.speed < 5 ? "Stopped" : "Moving"
}));

res.json(result);
```

} catch (e) {
console.log("DASHBOARD ERROR:", e);
res.status(500).json({ error: e.message });
}
});

app.post("/generate-summary", async (req, res) => {
try {
const { truck_id } = req.body;

```
const { data, error } = await supabase
  .from("locations")
  .select("*")
  .eq("truck_id", truck_id)
  .order("timestamp", { ascending: false })
  .limit(50);

if (error) throw error;

const prompt =
  "Analyze this trip data and give short insight: " +
  JSON.stringify(data);

const response = await axios.post(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
    process.env.GEMINI_API_KEY,
  {
    contents: [{ parts: [{ text: prompt }] }]
  }
);

const text =
  response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No insight";

res.json({ insight: text });
```

} catch (e) {
console.log("AI ERROR:", e);
res.json({ insight: "AI failed" });
}
});

app.listen(PORT, () => {
console.log("Server running on port " + PORT);
});
