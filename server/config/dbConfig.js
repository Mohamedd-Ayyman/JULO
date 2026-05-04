import mongoose from "mongoose";
import { config } from "./env.js";
import logger from "../utils/logger.js";

const options = {
  maxPoolSize: 20,              // Max concurrent connections
  minPoolSize: 5,               // Keep-alive connections
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45_000,
  family: 4,                    // Prefer IPv4
  retryWrites: true,
  retryReads: true,
};

if (config.isProduction) {
  options.directConnection = false;
  options.replicaSet = process.env.MONGO_REPLICA_SET || undefined;
}

mongoose.connect(config.connString, options).catch((err) => {
  logger.error("[DB] Connection failed", { error: err.message });
  process.exit(1);
});

const db = mongoose.connection;

db.on("connected", () => {
  logger.info("[DB] Connected", { connString: config.connString.replace(/\/\/.*@/, "//<cred>@") });
});

db.on("error", (err) => {
  logger.error("[DB] Error", { error: err.message });
});

db.on("disconnected", () => {
  logger.warn("[DB] Disconnected — attempting reconnect");
});

db.on("reconnected", () => {
  logger.info("[DB] Reconnected");
});

mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.log("❌ MongoDB connection error:", err);
});

export default db;