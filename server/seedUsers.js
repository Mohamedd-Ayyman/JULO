import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/user.js";

const users = [
  { firstname: "Alice", lastname: "Johnson", email: "alice@example.com", password: "Password1" },
  { firstname: "Bob", lastname: "Smith", email: "bob@example.com", password: "Password2" },
  { firstname: "Charlie", lastname: "Brown", email: "charlie@example.com", password: "Password3" },
  { firstname: "Diana", lastname: "Prince", email: "diana@example.com", password: "Password4" },
  { firstname: "Eve", lastname: "Adams", email: "eve@example.com", password: "Password5" },
  { firstname: "Frank", lastname: "Miller", email: "frank@example.com", password: "Password6" },
  { firstname: "Grace", lastname: "Lee", email: "grace@example.com", password: "Password7" },
  { firstname: "Henry", lastname: "Wilson", email: "henry@example.com", password: "Password8" },
  { firstname: "Ivy", lastname: "Taylor", email: "ivy@example.com", password: "Password9" },
  { firstname: "Jack", lastname: "Anderson", email: "jack@example.com", password: "Password10" },
];

async function seed() {
  try {
    await mongoose.connect(process.env.CONN_STRING);
    console.log("DB connected");

    await User.deleteMany({});
    console.log("Cleared existing users");

    const hashedUsers = await Promise.all(
      users.map(async (u) => ({
        ...u,
        password: await bcrypt.hash(u.password, 10),
      }))
    );

    const result = await User.insertMany(hashedUsers);
    console.log(`Created ${result.length} users`);

    await mongoose.disconnect();
    console.log("Done");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
