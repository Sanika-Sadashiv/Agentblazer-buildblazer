require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const sanitizeInput = require("./middleware/sanitize");
const { verifySmtp } = require("./utils/sendEmail");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const teamRoutes = require("./routes/teamRoutes");
const leadershipRoutes = require("./routes/leadershipRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const memberRoutes = require("./routes/memberRoutes");
const contactRoutes = require("./routes/contactRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const statsRoutes = require("./routes/statsRoutes");

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Useful for Vercel previews. In production, set FRONTEND_URL
      // to the exact frontend URL(s) you want to allow.
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      return callback(new Error("CORS: origin not allowed"));
    },
    credentials: true
  })
);

// Raised from 2mb so events with several uploaded photos (stored as base64
// in the gallery array) fit in a single request, while staying safely under
// MongoDB's 16MB per-document limit.
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(sanitizeInput);

// Make sure MongoDB is connected before any route runs. On Vercel the
// function can start handling a request before the connection is ready,
// which makes every query hang/fail and the site silently fall back to
// its built-in demo data.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    res.status(503).json({ message: "Database unavailable", error: error.message });
  }
});

app.get("/", (req, res) => {
  res.json({
    name: "AgentBlazer Club API",
    status: "running",
    version: "1.0.0",
    api: "/api"
  });
});

app.get("/api/health/db", (req, res) => {
  const mongoose = require("mongoose");
  res.json({
    connected: mongoose.connection.readyState === 1,
    database: mongoose.connection.name
  });
});

app.get("/api/health/smtp", async (req, res) => {
  try {
    await verifySmtp();
    res.json({ smtp: "ok" });
  } catch (error) {
    res.status(500).json({ smtp: "failed", code: error.code, message: error.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "agentblazer-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/leadership", leadershipRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/stats", statsRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
    path: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "production" ? undefined : err.message
  });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`AgentBlazer backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
} else {
  // Running as a serverless function (e.g. on Vercel) — connect to the
  // database, but don't call app.listen(); Vercel handles the HTTP server.
  connectDB().catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });
  // (the middleware above also awaits the connection on every request)
}

module.exports = app;
