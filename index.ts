// server/server.ts
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
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
import notificationRoutes from "./routes/notification-Routes";
import teamRoutes from "./routes/team-Routes";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";

const app = express();

// MongoDB connection
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

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001"
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200
};

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

// Add CORS preflight handling
app.options("*", cors(corsOptions));

// Routes
app.use("/api", authRoutes);
app.use("/api", contactRoutes);
app.use("/api", tagRoutes);
app.use("/api", profileRoutes);
app.use("/api", activityRoutes);
app.use("/api", chatRoutes);
app.use("/api", searchRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", messageRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", notificationRoutes);
app.use("/api", teamRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global error handler:", err);
  
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "CORS error",
      message: "Origin not allowed",
      details: req.headers.origin
    });
  }
  
  res.status(500).json({
    error: "Internal server error",
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
