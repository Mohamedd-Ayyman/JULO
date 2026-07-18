import request from "supertest";
import User from "../models/user.js";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import app from "../app.js";
import bcrypt from "bcryptjs";

let aliceToken, bobToken;
let aliceId, bobId;
let chatId;

beforeAll(async () => {
  await Message.deleteMany({});
  await Chat.deleteMany({});
  await User.deleteMany({});

  // Create two users
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
});

afterAll(async () => {
  await Message.deleteMany({});
  await Chat.deleteMany({});
  await User.deleteMany({});
});

describe("Message Routes", () => {
  // ── Create chat ──────────────────────────────────────────────────────────────
  describe("POST /api/chat/create-new-chat", () => {
    it("creates a chat between two users", async () => {
      const res = await request(app)
        .post("/api/chat/create-new-chat")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ members: [bobId] });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      chatId = res.body.data._id;
    });

    it("returns 400 if trying to chat with yourself", async () => {
      const res = await request(app)
        .post("/api/chat/create-new-chat")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ members: [aliceId] });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/message/new-message ───────────────────────────────────────────
  describe("POST /api/message/new-message", () => {
    it("returns 201 and creates message", async () => {
      const res = await request(app)
        .post("/api/message/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "Hello Bob, this is a test message!" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.text).toBe("Hello Bob, this is a test message!");
      expect(res.body.data.sender).toBe(aliceId);
    });

    it("returns 400 when text is empty", async () => {
      const res = await request(app)
        .post("/api/message/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 when chatId is missing", async () => {
      const res = await request(app)
        .post("/api/message/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ text: "Hello" });

      expect(res.status).toBe(400);
    });

    it("returns 403 when user is not a chat member", async () => {
      const hashed = await bcrypt.hash("StrangerPass1", 12);
      const stranger = await User.create({ firstname: "Stranger", lastname: "Test", email: "stranger@example.com", password: hashed });
      const strangerLogin = await request(app).post("/api/auth/login").send({ email: "stranger@example.com", password: "StrangerPass1" });
      const strangerToken = strangerLogin.body.token;

      const res = await request(app)
        .post("/api/message/new-message")
        .set("Authorization", `Bearer ${strangerToken}`)
        .send({ chatId, text: "I shouldn't be able to send this" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/message/retrieve-chat/:chatId ────────────────────────────────────
  describe("GET /api/message/retrieve-chat/:chatId", () => {
    it("returns 200 with cursor-paginated messages", async () => {
      const res = await request(app)
        .get(`/api/message/retrieve-chat/${chatId}?limit=50`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages).toBeDefined();
      expect(Array.isArray(res.body.data.messages)).toBe(true);
      expect(res.body.data.messages.length).toBeGreaterThan(0);
      expect(typeof res.body.data.hasMore).toBe("boolean");
    });

    it("returns correct cursor fields on first page", async () => {
      const res = await request(app)
        .get(`/api/message/retrieve-chat/${chatId}?limit=5`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      const { messages, nextCursor, prevCursor, hasMore } = res.body.data;
      expect(messages.length).toBeLessThanOrEqual(5);
      expect(prevCursor).toBeNull();
      if (messages.length === 5) {
        expect(typeof nextCursor).toBe("string");
        expect(hasMore).toBe(true);
      } else {
        expect(nextCursor).toBeNull();
        expect(hasMore).toBe(false);
      }
    });

    it("fetches older messages using nextCursor", async () => {
      const page1 = await request(app)
        .get(`/api/message/retrieve-chat/${chatId}?limit=2`)
        .set("Authorization", `Bearer ${aliceToken}`);

      const { nextCursor } = page1.body.data;
      expect(nextCursor).toBeDefined();

      const page2 = await request(app)
        .get(`/api/message/retrieve-chat/${chatId}?cursor=${nextCursor}&limit=2`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(page2.status).toBe(200);
      expect(page2.body.data.messages.length).toBeGreaterThan(0);
      expect(page2.body.data.messages[0]._id).not.toBe(page1.body.data.messages[0]._id);
    });

    it("fetches newer messages using prevCursor + direction=forward", async () => {
      const page1 = await request(app)
        .get(`/api/message/retrieve-chat/${chatId}?limit=2`)
        .set("Authorization", `Bearer ${aliceToken}`);

      const { nextCursor } = page1.body.data;
      const page2 = await request(app)
        .get(`/api/message/retrieve-chat/${chatId}?cursor=${nextCursor}&limit=2`)
        .set("Authorization", `Bearer ${aliceToken}`);

      const { prevCursor } = page2.body.data;
      expect(prevCursor).toBeDefined();

      const page2Forward = await request(app)
        .get(`/api/message/retrieve-chat/${chatId}?cursor=${prevCursor}&direction=forward&limit=2`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(page2Forward.status).toBe(200);
      expect(page2Forward.body.data.messages.length).toBeGreaterThan(0);
      expect(page2Forward.body.data.messages[0]._id).toBe(page1.body.data.messages[0]._id);
    });

    it("returns hasMore=false when no more messages", async () => {
      const res = await request(app)
        .get(`/api/message/retrieve-chat/${chatId}?limit=100`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasMore).toBe(false);
      expect(res.body.data.nextCursor).toBeNull();
    });

    it("caps limit at 100", async () => {
      const res = await request(app)
        .get(`/api/message/retrieve-chat/${chatId}?limit=999`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.messages.length).toBeLessThanOrEqual(100);
    });

    it("returns 403 for non-member", async () => {
      const hashed = await bcrypt.hash("NonMemberPass1", 12);
      const nonMember = await User.create({ firstname: "Non", lastname: "Member", email: "nonmember@example.com", password: hashed });
      const loginRes = await request(app).post("/api/auth/login").send({ email: "nonmember@example.com", password: "NonMemberPass1" });
      const nonMemberToken = loginRes.body.token;

      const res = await request(app)
        .get(`/api/message/retrieve-chat/${chatId}`)
        .set("Authorization", `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ── PUT /api/message/:messageId (edit) ──────────────────────────────────────
  describe("PUT /api/message/:messageId", () => {
    it("allows sender to edit their message", async () => {
      const msgRes = await request(app)
        .post("/api/message/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "Original text" });

      const messageId = msgRes.body.data._id;

      const editRes = await request(app)
        .put(`/api/message/${messageId}`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ text: "Edited text" });

      expect(editRes.status).toBe(200);
      expect(editRes.body.data.text).toBe("Edited text");
      expect(editRes.body.data.edited).toBe(true);
    });

    it("returns 403 when another user tries to edit", async () => {
      const msgRes = await request(app)
        .post("/api/message/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "Alice's private message" });

      const messageId = msgRes.body.data._id;

      const editRes = await request(app)
        .put(`/api/message/${messageId}`)
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ text: "Bob tries to edit" });

      expect(editRes.status).toBe(403);
    });

    it("returns 404 when message does not exist", async () => {
      const fakeId = "000000000000000000000000";
      const res = await request(app)
        .put(`/api/message/${fakeId}`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ text: "Trying to edit non-existent message" });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/message/:messageId ───────────────────────────────────────────
  describe("DELETE /api/message/:messageId", () => {
    it("allows sender to soft-delete their message", async () => {
      const msgRes = await request(app)
        .post("/api/message/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "Delete this message" });

      const messageId = msgRes.body.data._id;

      const delRes = await request(app)
        .delete(`/api/message/${messageId}`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // Verify message is soft-deleted (text replaced, deleted flag set)
      const getRes = await request(app)
        .get(`/api/message/retrieve-chat/${chatId}`)
        .set("Authorization", `Bearer ${aliceToken}`);

      const deleted = getRes.body.data.find((m) => m._id === messageId);
      expect(deleted.text).toBe("[deleted]");
      expect(deleted.deleted).toBe(true);
    });

    it("returns 403 when another user tries to delete", async () => {
      const msgRes = await request(app)
        .post("/api/message/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "Can't delete this" });

      const messageId = msgRes.body.data._id;

      const delRes = await request(app)
        .delete(`/api/message/${messageId}`)
        .set("Authorization", `Bearer ${bobToken}`);

      expect(delRes.status).toBe(403);
    });
  });

  // ── PUT /api/message/mark-read ──────────────────────────────────────────────
  describe("PUT /api/message/mark-read", () => {
    it("marks unread messages as read", async () => {
      const res = await request(app)
        .put("/api/message/mark-read")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ chatId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 400 when chatId is missing", async () => {
      const res = await request(app)
        .put("/api/message/mark-read")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("returns 403 when user is not a member", async () => {
      const hashed = await bcrypt.hash("NotMemberPass1", 12);
      const notMember = await User.create({ firstname: "Not", lastname: "Member", email: "notmember2@example.com", password: hashed });
      const loginRes = await request(app).post("/api/auth/login").send({ email: "notmember2@example.com", password: "NotMemberPass1" });
      const notMemberToken = loginRes.body.token;

      const res = await request(app)
        .put("/api/message/mark-read")
        .set("Authorization", `Bearer ${notMemberToken}`)
        .send({ chatId });

      expect(res.status).toBe(403);
    });
  });

  // ── Message Status ────────────────────────────────────────────────────────
  describe("Message status field", () => {
    it("sets status to 'sent' on new message", async () => {
      const res = await request(app)
        .post("/api/message/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "Status test message" });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("sent");
    });
  });

  // ── POST /api/chat/:chatId/messages/:messageId/deliver ─────────────────────
  describe("POST /api/chat/:chatId/messages/:messageId/deliver", () => {
    let messageId;

    beforeAll(async () => {
      const msgRes = await request(app)
        .post("/api/message/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "Delivery receipt test" });
      messageId = msgRes.body.data._id;
    });

    it("marks message as delivered", async () => {
      const res = await request(app)
        .post(`/api/chat/${chatId}/messages/${messageId}/deliver`)
        .set("Authorization", `Bearer ${bobToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("delivered");
      expect(res.body.data.deliveredTo.length).toBeGreaterThan(0);
    });

    it("does not double-deliver", async () => {
      const res = await request(app)
        .post(`/api/chat/${chatId}/messages/${messageId}/deliver`)
        .set("Authorization", `Bearer ${bobToken}`);

      expect(res.status).toBe(200);
      const deliveredCount = res.body.data.deliveredTo.filter(
        (d) => d.userId === bobId
      ).length;
      expect(deliveredCount).toBe(1);
    });

    it("sender delivery is a no-op (returns message unchanged)", async () => {
      const res = await request(app)
        .post(`/api/chat/${chatId}/messages/${messageId}/deliver`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
    });

    it("returns 403 for non-member", async () => {
      const hashed = await bcrypt.hash("DeliverStranger1", 12);
      const stranger = await User.create({ firstname: "Del", lastname: "Stranger", email: "deliverstranger@example.com", password: hashed });
      const loginRes = await request(app).post("/api/auth/login").send({ email: "deliverstranger@example.com", password: "DeliverStranger1" });

      const res = await request(app)
        .post(`/api/chat/${chatId}/messages/${messageId}/deliver`)
        .set("Authorization", `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/chat/:chatId/messages/batch-deliver ──────────────────────────
  describe("POST /api/chat/:chatId/messages/batch-deliver", () => {
    let messageIds;

    beforeAll(async () => {
      const msgs = await Promise.all([
        request(app)
          .post("/api/message/new-message")
          .set("Authorization", `Bearer ${aliceToken}`)
          .send({ chatId, text: "Batch deliver 1" }),
        request(app)
          .post("/api/message/new-message")
          .set("Authorization", `Bearer ${aliceToken}`)
          .send({ chatId, text: "Batch deliver 2" }),
      ]);
      messageIds = msgs.map((m) => m.body.data._id);
    });

    it("marks multiple messages as delivered", async () => {
      const res = await request(app)
        .post(`/api/chat/${chatId}/messages/batch-deliver`)
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ messageIds, chatId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      for (const item of res.body.data) {
        expect(item.status).toBe("ok");
        expect(item.messageStatus).toBe("delivered");
      }
    });

    it("returns 400 when messageIds is empty", async () => {
      const res = await request(app)
        .post(`/api/chat/${chatId}/messages/batch-deliver`)
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ messageIds: [], chatId });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/chat/:chatId/messages/:messageId/receipts ─────────────────────
  describe("GET /api/chat/:chatId/messages/:messageId/receipts", () => {
    let messageId;

    beforeAll(async () => {
      const msgRes = await request(app)
        .post("/api/message/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "Receipt detail test" });
      messageId = msgRes.body.data._id;

      await request(app)
        .post(`/api/chat/${chatId}/messages/${messageId}/deliver`)
        .set("Authorization", `Bearer ${bobToken}`);

      await request(app)
        .put("/api/message/mark-read")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ chatId });
    });

    it("returns delivery and read receipt details", async () => {
      const res = await request(app)
        .get(`/api/chat/${chatId}/messages/${messageId}/receipts`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messageId).toBe(messageId);
      expect(res.body.data.deliveredTo.length).toBeGreaterThan(0);
      expect(res.body.data.readBy.length).toBeGreaterThan(0);
      expect(res.body.data.deliveredTo[0].user).toBeDefined();
      expect(res.body.data.readBy[0].user).toBeDefined();
    });

    it("returns 403 for non-member", async () => {
      const hashed = await bcrypt.hash("ReceiptStranger1", 12);
      const stranger = await User.create({ firstname: "Receipt", lastname: "Stranger", email: "receiptstranger@example.com", password: hashed });
      const loginRes = await request(app).post("/api/auth/login").send({ email: "receiptstranger@example.com", password: "ReceiptStranger1" });

      const res = await request(app)
        .get(`/api/chat/${chatId}/messages/${messageId}/receipts`)
        .set("Authorization", `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── GET /api/chat/users/:userId/last-seen ──────────────────────────────────
  describe("GET /api/chat/users/:userId/last-seen", () => {
    it("returns last seen info for a user", async () => {
      const res = await request(app)
        .get(`/api/chat/users/${bobId}/last-seen`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(bobId);
      expect(typeof res.body.data.isOnline).toBe("boolean");
      expect(res.body.data).toHaveProperty("lastSeen");
      expect(typeof res.body.data.showOnlineStatus).toBe("boolean");
    });

    it("returns 404 for non-existent user", async () => {
      const fakeId = "000000000000000000000000";
      const res = await request(app)
        .get(`/api/chat/users/${fakeId}/last-seen`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(404);
    });
  });
});