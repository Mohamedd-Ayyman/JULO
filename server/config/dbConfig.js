import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

import mongoose from "mongoose";

mongoose.connect(process.env.CONN_STRING);

const db = mongoose.connection;

db.on("connected", () => {
  console.log("DB connection successful!");
});

db.on("error", () => {
  console.log("DB connection failed!");
});

export default db;
