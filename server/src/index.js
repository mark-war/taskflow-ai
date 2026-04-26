import "dotenv/config";
import express, { json, urlencoded } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { dirname, join } from "path";

import connectDB from "./config/db.js";
import { initSocket } from "./socket/index.js";
import errorHandler from "./middleware/errorHandler.js";

// Routes
import authRoutes from "./routes/auth.js";
import boardRoutes from "./routes/boards.js";
import taskRoutes from "./routes/tasks.js";
import userRoutes from "./routes/users.js";
import teamRoutes from "./routes/teams.js";
import aiRoutes from "./routes/ai.js";
import fileRoutes from "./routes/files.js";
import activityRoutes from "./routes/activity.js";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible in routes/controllers
app.set("io", io);

// Connect DB
connectDB();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
});
app.use("/api/", limiter);

// AI endpoints get their own (lower) limit to avoid Groq quota issues
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many AI requests, slow down a bit." },
});
app.use("/api/ai/", aiLimiter);

// Body parsing
app.use(json({ limit: "10mb" }));
app.use(urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Static uploads
app.use("/uploads", express.static(join(__dirname, "../uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/activity", activityRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use(errorHandler);

// Init socket handlers
initSocket(io);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`\n🚀 TaskFlow server running on port ${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV}`);
  console.log(
    `   AI:   Groq ${process.env.GROQ_MODEL || "llama-3.3-70b-versatile"}\n`,
  );
});
