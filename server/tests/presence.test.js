import request from "supertest";
import User from "../models/user.js";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import app from "../app.js";
import bcrypt from "bcryptjs";
import presenceService from "../services/presenceService.js";
import typingService from "../services/typingService.js";

let aliceToken, bobToken;
let aliceId, bobId;
let chatId;

beforeAll(async () => {
  await Message.deleteMany({});
  await Chat.deleteMany({});
  await User.deleteMany({});

  const [aliceHashed, bobHashed] = await Promise.all([
    bcrypt.hash("AlicePass1", 12),
    bcrypt.hash("BobPass1", 12),
  ]);

  const [alice, bob] = await Promise.all([
    User.create({ firstname: "Alice", lastname: "Smith", email: "alice@example.com", password: aliceHashed }),
    User.create({ firstname: "Bob", lastname: "Jones", email: "bob@example.com", password: bobHashed }),
  ]);

  aliceId = alice._id.toString();
  bobId = bob._id.toString();

  const [aliceLogin, bobLogin] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: "alice@example.com", password: "AlicePass1" }),
    request(app).post("/api/auth/login").send({ email: "bob@example.com", password: "BobPass1" }),
  ]);

  aliceToken = aliceLogin.body.token;
  bobToken = bobLogin.body.token;

  const chatRes = await request(app)
    .post("/api/chat/create-new-chat")
    .set("Authorization", `Bearer ${aliceToken}`)
    .send({ members: [bobId] });

  chatId = chatRes.body.data._id;
});

afterAll(async () => {
  await Message.deleteMany({});
  await Chat.deleteMany({});
  await User.deleteMany({});
});

describe("Presence Service", () => {
  describe("getPresence", () => {
    it("returns presence for a user", async () => {
      const presence = await presenceService.getPresence(aliceId);
      expect(presence).toHaveProperty("isOnline");
      expect(presence).toHaveProperty("lastSeen");
    });

    it("returns null presence for nonexistent user", async () => {
      const fakeId = "000000000000000000000000";
      const presence = await presenceService.getPresence(fakeId);
      expect(presence.isOnline).toBe(false);
    });
  });

  describe("getBulkPresence", () => {
    it("returns presence for multiple users", async () => {
      const result = await presenceService.getBulkPresence([aliceId, bobId]);
      expect(result).toHaveProperty(aliceId);
      expect(result).toHaveProperty(bobId);
      expect(result[aliceId]).toHaveProperty("isOnline");
      expect(result[bobId]).toHaveProperty("isOnline");
    });

    it("returns empty object for empty input", async () => {
      const result = await presenceService.getBulkPresence([]);
      expect(result).toEqual({});
    });
  });

  describe("getChatMemberIds", () => {
    it("returns member IDs for a user's chats", async () => {
      const members = await presenceService.getChatMemberIds(aliceId);
      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBeGreaterThan(0);
    });

    it("returns empty array for user with no chats", async () => {
      const fakeId = "000000000000000000000000";
      const members = await presenceService.getChatMemberIds(fakeId);
      expect(members).toEqual([]);
    });
  });

  describe("isMemberOfChat", () => {
    it("returns true for chat member", async () => {
      const isMember = await presenceService.isMemberOfChat(aliceId, chatId);
      expect(isMember).toBe(true);
    });

    it("returns false for non-member", async () => {
      const hashed = await bcrypt.hash("NonMember1", 12);
      const nonMember = await User.create({ firstname: "Non", lastname: "Member", email: "nonmember@test.com", password: hashed });
      const isMember = await presenceService.isMemberOfChat(nonMember._id.toString(), chatId);
      expect(isMember).toBe(false);
    });
  });
});

describe("Typing Service", () => {
  describe("startTyping / stopTyping", () => {
    it("does not throw when called with valid params", async () => {
      const mockIo = { to: () => ({ emit: () => {} }) };
      await expect(typingService.startTyping(aliceId, chatId, mockIo)).resolves.not.toThrow();
      await expect(typingService.stopTyping(aliceId, chatId, mockIo)).resolves.not.toThrow();
    });

    it("silently skips non-members", async () => {
      const fakeId = "000000000000000000000000";
      const mockIo = { to: () => ({ emit: () => {} }) };
      await expect(typingService.startTyping(fakeId, chatId, mockIo)).resolves.not.toThrow();
    });

    it("silently skips missing chatId", async () => {
      const mockIo = { to: () => ({ emit: () => {} }) };
      await expect(typingService.startTyping(aliceId, null, mockIo)).resolves.not.toThrow();
    });
  });

  describe("clearAllForUser", () => {
    it("clears all typing timers for a user", () => {
      expect(() => typingService.clearAllForUser(aliceId)).not.toThrow();
    });
  });

  describe("clearOnMessageSent", () => {
    it("clears typing and emits stopped event", async () => {
      let emittedEvent = null;
      let emittedPayload = null;
      const mockIo = {
        to: () => ({
          emit: (event, payload) => {
            emittedEvent = event;
            emittedPayload = payload;
          },
        }),
      };

      await typingService.clearOnMessageSent(aliceId, chatId, mockIo);
      expect(emittedEvent).toBe("user_stopped_typing");
      expect(emittedPayload).toEqual({ chatId, userId: aliceId });
    });
  });
});

describe("Presence REST API", () => {
  describe("GET /api/presence/:userId", () => {
    it("returns presence for a specific user", async () => {
      const res = await request(app)
        .get(`/api/presence/${bobId}`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("isOnline");
    });

    it("returns own presence as online", async () => {
      const res = await request(app)
        .get(`/api/presence/${aliceId}`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isOnline).toBe(true);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .get(`/api/presence/${bobId}`);

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/presence?userIds=", () => {
    it("returns bulk presence", async () => {
      const res = await request(app)
        .get(`/api/presence?userIds=${aliceId},${bobId}`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty(aliceId);
      expect(res.body.data).toHaveProperty(bobId);
    });

    it("returns 400 when userIds is missing", async () => {
      const res = await request(app)
        .get("/api/presence")
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 when userIds exceeds 100", async () => {
      const manyIds = Array.from({ length: 101 }, (_, i) => `00000000000000000000${String(i).padStart(4, "0")}`).join(",");
      const res = await request(app)
        .get(`/api/presence?userIds=${manyIds}`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(400);
    });
  });
});
