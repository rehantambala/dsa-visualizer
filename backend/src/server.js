const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const store = {
  algorithms: [],
  sessions: [],
  analytics: {
    mostUsed: [],
    averageSteps: 0,
    visualizationUsage: [],
  },
};

const recomputeAnalytics = () => {
  const counts = {};
  let totalSteps = 0;
  let stepRows = 0;
  store.algorithms.forEach((row) => {
    counts[row.algorithm] = (counts[row.algorithm] || 0) + 1;
    if (typeof row.numberOfSteps === "number") {
      totalSteps += row.numberOfSteps;
      stepRows += 1;
    }
  });

  const visCounts = {};
  store.sessions.forEach((row) => {
    visCounts[row.visualization || "unknown"] = (visCounts[row.visualization || "unknown"] || 0) + 1;
  });

  store.analytics = {
    mostUsed: Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    averageSteps: stepRows ? Math.round(totalSteps / stepRows) : 0,
    visualizationUsage: Object.entries(visCounts).map(([name, count]) => ({ name, count })),
  };
};

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({ message: "API is working" });
});

app.get("/api/algorithms", (req, res) => res.json(store.algorithms));
app.post("/api/algorithms", (req, res) => {
  const payload = { id: Date.now(), ...req.body };
  store.algorithms.push(payload);
  recomputeAnalytics();
  res.status(201).json(payload);
});

app.get("/api/sessions", (req, res) => res.json(store.sessions));
app.post("/api/sessions", (req, res) => {
  const payload = { id: Date.now(), createdAt: new Date().toISOString(), ...req.body };
  store.sessions.push(payload);
  recomputeAnalytics();
  res.status(201).json(payload);
});

app.get("/api/analytics", (req, res) => res.json(store.analytics));
app.post("/api/analytics", (req, res) => {
  store.algorithms.push({ id: Date.now(), ...req.body, numberOfSteps: req.body.stepCount || req.body.numberOfSteps });
  recomputeAnalytics();
  res.status(201).json(store.analytics);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
