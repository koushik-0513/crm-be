// server/server.ts
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";

import authRoutes from "./routes/auth";
import contactRoutes from "./routes/contact-Routes";
import tagRoutes from "./routes/tag-Routes";
import profileRoutes from "./routes/profile-Routes";
import activityRoutes from "./routes/activity-Routes";
import chatRoutes from "./routes/chat-Routes"; 
import searchRoutes from "./routes/search-Routes";
import aiRoutes from "./routes/ai-Routes";
import messageRoutes from "./routes/message-Routes";
import dashboardRoutes from "./routes/dashboard-Routes";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";



const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});


  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI environment variable is not set");
    process.exit(1);
  }
  mongoose.connect(mongoUri).then(() => {
  console.log("Connected to MongoDB");
}).catch((err: unknown) => {
  console.error("MongoDB error:", err);
});

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

// Routes
app.use("/api", authRoutes);
app.use("/api", contactRoutes);
app.use("/api", tagRoutes);
app.use("/api", profileRoutes);
app.use("/api", activityRoutes);
app.use("/api", chatRoutes);
app.use("/api", searchRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api", dashboardRoutes);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
