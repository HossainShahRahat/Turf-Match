import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import http from "http";
import mongoose from "mongoose";
import { Server as SocketServer } from "socket.io";
import authRoutes from "./routes/auth.js";
import matchesRoutes from "./routes/matches.js";
import playersRoutes from "./routes/players.js";
import tournamentsRoutes from "./routes/tournaments.js";
import transfersRoutes from "./routes/transfers.js";
import { cloudinaryConfigured } from "./services/cloudinary.js";

dotenv.config();

const requiredEnv = ["MONGODB_URI", "JWT_SECRET", "ADMIN_PASSWORD"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
if (!process.env.ADMIN_ID && !process.env.ADMIN_EMAIL) {
  throw new Error("Missing required env var: ADMIN_ID (or ADMIN_EMAIL)");
}

const app = express();
const port = Number(process.env.PORT || process.env.BACKEND_PORT || 5000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "*";
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: frontendOrigin },
});
io.on("connection", (socket) => {
  socket.on("match:watch", (matchId) => {
    if (typeof matchId === "string" && matchId.trim()) {
      socket.join(matchId.trim());
    }
  });
});

app.use(
  cors({
    origin: frontendOrigin.split(",").map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.set("io", io);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.status(200).json({
    name: "turf-match-backend",
    status: "running",
    port
  });
});

app.use("/auth", authRoutes);
app.use("/players", playersRoutes);
app.use("/matches", matchesRoutes);
app.use("/transfers", transfersRoutes);
app.use("/tournaments", tournamentsRoutes);
import statsRoutes from "./routes/stats.js";
app.use("/stats", statsRoutes);

async function startServer() {
  await mongoose.connect(process.env.MONGODB_URI);
  if (!cloudinaryConfigured()) {
  }

  server.listen(port, () => {
  });
}

startServer().catch((error) => {
  process.exit(1);
});
