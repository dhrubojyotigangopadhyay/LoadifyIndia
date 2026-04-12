const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_KEY
);

app.get("/", (req, res) => {
res.send("Loadify backend running");
});

app.post("/start-trip", async (req, res) => {
try {
const { truck_id } = req.body;

```
const { data } = await supabase
  .from("trips")
  .insert([{ truck_id, start_time: new Date() }])
  .select();

res.json(data);
```

} catch (e) {
res.status(500).json({ error: "start trip failed" });
}
});

app.post("/send-location", async (req, res) => {
try {
const { truck_id, lat, lng, speed } = req.body;

```
await supabase.from("locations").insert([
  {
    truck_id,
    lat,
    lng,
    speed,
    timestamp: new Date()
  }
]);

res.json({ success: true });
```

} catch (e) {
res.status(500).json({ error: "location failed" });
}
});

app.post("/end-trip", async (req, res) => {
try {
const { trip_id } = req.body;

```
await supabase
  .from("trips")
  .update({ end_time: new Date() })
  .eq("id", trip_id);

res.json({ success: true });
```

} catch (e) {
res.status(500).json({ error: "end trip failed" });
}
});

app.get("/dashboard", async (req, res) => {
try {
const { data } = await supabase
.from("locations")
.select("*")
.order("timestamp", { ascending: false });

```
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
res.status(500).json({ error: "dashboard failed" });
}
});

app.post("/generate-summary", async (req, res) => {
try {
const { truck_id } = req.body;

```
const { data } = await supabase
  .from("locations")
  .select("*")
  .eq("truck_id", truck_id)
  .order("timestamp", { ascending: false })
  .limit(50);

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
res.json({ insight: "AI failed" });
}
});

app.listen(PORT, () => {
console.log("Server running");
});
