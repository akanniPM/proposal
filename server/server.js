require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/auth");
const proposalRoutes = require("./routes/proposals");
const invoiceRoutes = require("./routes/invoices");
const billingRoutes = require("./routes/billing");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json({ limit: "2mb" }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

app.use("/api/auth", authLimiter);
app.use("/api/", limiter);

app.use("/api/auth", authRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/billing", billingRoutes);

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() })
);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai_proposals";

mongoose
  .connect(MONGODB_URI, {
    maxPoolSize: 20,
    minPoolSize: 5,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log("MongoDB connected");
    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    process.on("SIGTERM", () => {
      server.close(() => {
        mongoose.connection.close();
        process.exit(0);
      });
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
