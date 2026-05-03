import request from "supertest";
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import app from "../app.js";

describe("Auth Routes", () => {
  beforeAll(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  // ── POST /api/auth/signup ──────────────────────────────────────────────────────
  describe("POST /api/auth/signup", () => {
    it("returns 201 on valid registration", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ firstname: "Test", lastname: "User", email: "test@example.com", password: "Password1" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(201);
    });

    it("returns 400 when firstname is missing", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ lastname: "User", email: "test2@example.com", password: "Password1" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
    });

    it("returns 400 when password is too short", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ firstname: "Test", lastname: "User", email: "test3@example.com", password: "short" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 when password lacks uppercase", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ firstname: "Test", lastname: "User", email: "test4@example.com", password: "password1" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("uppercase");
    });

    it("returns 409 on duplicate email", async () => {
      await request(app)
        .post("/api/auth/signup")
        .send({ firstname: "Alice", lastname: "Bob", email: "dup@example.com", password: "Password1" });

      const res = await request(app)
        .post("/api/auth/signup")
        .send({ firstname: "Alice", lastname: "Bob", email: "dup@example.com", password: "Password1" });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /api/auth/login ──────────────────────────────────────────────────────
  describe("POST /api/auth/login", () => {
    it("returns token + 200 on correct credentials", async () => {
      const hashed = await bcrypt.hash("LoginPassword1", 12);
      await User.create({ firstname: "Login", lastname: "User", email: "login@example.com", password: hashed });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "login@example.com", password: "LoginPassword1" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.statusCode).toBe(200);
    });

    it("returns 401 when email not found", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "notfound@example.com", password: "Password1" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 on wrong password", async () => {
      const hashed = await bcrypt.hash("CorrectPass1", 12);
      await User.create({ firstname: "Wrong", lastname: "Pass", email: "wrong@example.com", password: hashed });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "wrong@example.com", password: "WrongPass123" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 when email is missing", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ password: "Password1" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /api/auth/logout ──────────────────────────────────────────────────────
  describe("POST /api/auth/logout", () => {
    it("returns 200 when token is valid", async () => {
      const hashed = await bcrypt.hash("LogoutPass1", 12);
      const user = await User.create({ firstname: "Logout", lastname: "User", email: "logout@example.com", password: hashed });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "logout@example.com", password: "LogoutPass1" });

      const token = loginRes.body.token;

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 401 when no token is provided", async () => {
      const res = await request(app).post("/api/auth/logout");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});