import request from "supertest";
import User from "../models/user.js";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import Block from "../models/block.js";
import Report from "../models/report.js";
import Participant from "../models/participant.js";
import Notification from "../models/notification.js";
import app from "../app.js";
import bcrypt from "bcryptjs";

let aliceToken, bobToken, modToken;
let aliceId, bobId, modId;
let chatId, messageId;

beforeAll(async () => {
  await Notification.deleteMany({});
  await Report.deleteMany({});
  await Block.deleteMany({});
  await Message.deleteMany({});
  await Participant.deleteMany({});
  await Chat.deleteMany({});
  await User.deleteMany({});

  const [aliceHashed, bobHashed, modHashed] = await Promise.all([
    bcrypt.hash("AlicePass1", 12),
    bcrypt.hash("BobPass1", 12),
    bcrypt.hash("ModPass1", 12),
  ]);

  const [alice, bob, mod] = await Promise.all([
    User.create({ firstname: "Alice", lastname: "Smith", email: "alice@example.com", password: aliceHashed }),
    User.create({ firstname: "Bob", lastname: "Jones", email: "bob@example.com", password: bobHashed }),
    User.create({ firstname: "Mod", lastname: "erator", email: "mod@example.com", password: modHashed, role: "moderator" }),
  ]);

  aliceId = alice._id.toString();
  bobId = bob._id.toString();
  modId = mod._id.toString();

  const [aliceLogin, bobLogin, modLogin] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: "alice@example.com", password: "AlicePass1" }),
    request(app).post("/api/auth/login").send({ email: "bob@example.com", password: "BobPass1" }),
    request(app).post("/api/auth/login").send({ email: "mod@example.com", password: "ModPass1" }),
  ]);

  aliceToken = aliceLogin.body.token;
  bobToken = bobLogin.body.token;
  modToken = modLogin.body.token;

  const chatRes = await request(app)
    .post("/api/chat/create-new-chat")
    .set("Authorization", `Bearer ${aliceToken}`)
    .send({ members: [bobId] });

  chatId = chatRes.body.data._id;

  const msgRes = await request(app)
    .post("/api/chat/new-message")
    .set("Authorization", `Bearer ${aliceToken}`)
    .send({ chatId, text: "Test message for reporting" });

  messageId = msgRes.body.data._id;
});

afterAll(async () => {
  await Notification.deleteMany({});
  await Report.deleteMany({});
  await Block.deleteMany({});
  await Message.deleteMany({});
  await Participant.deleteMany({});
  await Chat.deleteMany({});
  await User.deleteMany({});
});

describe("Moderation — Blocking", () => {
  describe("POST /api/moderation/block", () => {
    it("blocks a user", async () => {
      const res = await request(app)
        .post("/api/moderation/block")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: bobId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.blockerId).toBe(aliceId);
      expect(res.body.data.blockedId).toBe(bobId);
    });

    it("returns 409 for duplicate block", async () => {
      const res = await request(app)
        .post("/api/moderation/block")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: bobId });

      expect(res.status).toBe(409);
    });

    it("returns 400 when blocking yourself", async () => {
      const res = await request(app)
        .post("/api/moderation/block")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: aliceId });

      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent user", async () => {
      const res = await request(app)
        .post("/api/moderation/block")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: "000000000000000000000000" });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/moderation/block/status/:userId", () => {
    it("returns block status (blocked by me)", async () => {
      const res = await request(app)
        .get(`/api/moderation/block/status/${bobId}`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.blocked).toBe(true);
      expect(res.body.data.blockedByMe).toBe(true);
      expect(res.body.data.blockedMe).toBe(false);
    });

    it("returns reverse block status (blocked me)", async () => {
      const res = await request(app)
        .get(`/api/moderation/block/status/${aliceId}`)
        .set("Authorization", `Bearer ${bobToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.blocked).toBe(true);
      expect(res.body.data.blockedByMe).toBe(false);
      expect(res.body.data.blockedMe).toBe(true);
    });
  });

  describe("GET /api/moderation/blocks", () => {
    it("lists blocked users", async () => {
      const res = await request(app)
        .get("/api/moderation/blocks")
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("Block enforcement — chat creation", () => {
    it("returns 403 when creating chat with blocked user", async () => {
      const res = await request(app)
        .post("/api/chat/create-new-chat")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ members: [bobId] });

      expect(res.status).toBe(403);
    });
  });

  describe("Block enforcement — message sending", () => {
    it("returns 403 when sending message to blocked user in direct chat", async () => {
      const res = await request(app)
        .post("/api/chat/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "Should fail" });

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/moderation/block/:userId", () => {
    it("unblocks a user", async () => {
      const res = await request(app)
        .delete(`/api/moderation/block/${bobId}`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("allows chat creation after unblock", async () => {
      const res = await request(app)
        .post("/api/chat/create-new-chat")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ members: [bobId] });

      expect(res.status).toBe(201);
    });

    it("allows message sending after unblock", async () => {
      const res = await request(app)
        .post("/api/chat/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "Message after unblock" });

      expect(res.status).toBe(201);
    });

    it("returns 404 for non-existent block", async () => {
      const res = await request(app)
        .delete(`/api/moderation/block/${aliceId}`)
        .set("Authorization", `Bearer ${bobToken}`);

      expect(res.status).toBe(404);
    });
  });
});

describe("Moderation — Reporting", () => {
  describe("POST /api/moderation/report", () => {
    it("reports a message", async () => {
      const res = await request(app)
        .post("/api/moderation/report")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ messageId, chatId, reason: "spam", description: "This is spam" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reason).toBe("spam");
      expect(res.body.data.targetType).toBe("message");
    });

    it("returns 409 for duplicate pending report", async () => {
      const res = await request(app)
        .post("/api/moderation/report")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ messageId, chatId, reason: "spam" });

      expect(res.status).toBe(409);
    });

    it("returns 400 when reporting own message", async () => {
      const msgRes = await request(app)
        .post("/api/chat/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "My own message" });

      const res = await request(app)
        .post("/api/moderation/report")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ messageId: msgRes.body.data._id, chatId, reason: "spam" });

      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent message", async () => {
      const res = await request(app)
        .post("/api/moderation/report")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ messageId: "000000000000000000000000", chatId, reason: "spam" });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/moderation/report/user", () => {
    it("reports a user", async () => {
      const res = await request(app)
        .post("/api/moderation/report/user")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ userId: aliceId, reason: "harassment", description: "Constant harassment" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.targetType).toBe("user");
    });

    it("returns 400 when reporting yourself", async () => {
      const res = await request(app)
        .post("/api/moderation/report/user")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ userId: bobId, reason: "spam" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/moderation/reports (mod only)", () => {
    it("returns reports for moderator", async () => {
      const res = await request(app)
        .get("/api/moderation/reports")
        .set("Authorization", `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("returns 403 for regular user", async () => {
      const res = await request(app)
        .get("/api/moderation/reports")
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(403);
    });

    it("filters by status", async () => {
      const res = await request(app)
        .get("/api/moderation/reports?status=pending")
        .set("Authorization", `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((r) => r.status === "pending")).toBe(true);
    });
  });

  describe("GET /api/moderation/reports/counts (mod only)", () => {
    it("returns report counts", async () => {
      const res = await request(app)
        .get("/api/moderation/reports/counts")
        .set("Authorization", `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("pending");
      expect(res.body.data).toHaveProperty("total");
      expect(res.body.data.pending).toBeGreaterThan(0);
    });
  });
});

describe("Moderation — Report Review & Actions", () => {
  let messageReportId, userReportId;

  beforeAll(async () => {
    const msg2Res = await request(app)
      .post("/api/chat/new-message")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ chatId, text: "Message to be deleted by mod" });

    const msgReport = await request(app)
      .post("/api/moderation/report")
      .set("Authorization", `Bearer ${bobToken}`)
      .send({ messageId: msg2Res.body.data._id, chatId, reason: "inappropriate_content" });

    messageReportId = msgReport.body.data._id;

    const userReport = await request(app)
      .post("/api/moderation/report/user")
      .set("Authorization", `Bearer ${bobToken}`)
      .send({ userId: aliceId, reason: "harassment" });

    userReportId = userReport.body.data._id;
  });

  describe("PUT /api/moderation/reports/:reportId/review", () => {
    it("allows moderator to dismiss a report", async () => {
      const res = await request(app)
        .put(`/api/moderation/reports/${messageReportId}/review`)
        .set("Authorization", `Bearer ${modToken}`)
        .send({ status: "dismissed", action: "none" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("dismissed");
    });

    it("allows moderator to resolve with message_deleted action", async () => {
      const msg3Res = await request(app)
        .post("/api/chat/new-message")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ chatId, text: "Another bad message" });

      const report3 = await request(app)
        .post("/api/moderation/report")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ messageId: msg3Res.body.data._id, chatId, reason: "spam" });

      const res = await request(app)
        .put(`/api/moderation/reports/${report3.body.data._id}/review`)
        .set("Authorization", `Bearer ${modToken}`)
        .send({ status: "resolved", action: "message_deleted", actionNote: "Removed spam" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("resolved");
      expect(res.body.data.action).toBe("message_deleted");

      const msgCheck = await Message.findById(msg3Res.body.data._id).lean();
      expect(msgCheck.deleted).toBe(true);
      expect(msgCheck.text).toBe("[removed by moderator]");
    });

    it("allows moderator to resolve with user_banned action", async () => {
      const res = await request(app)
        .put(`/api/moderation/reports/${userReportId}/review`)
        .set("Authorization", `Bearer ${modToken}`)
        .send({ status: "resolved", action: "user_banned", actionNote: "Banned for harassment" });

      expect(res.status).toBe(200);
      expect(res.body.data.action).toBe("user_banned");

      const userCheck = await User.findById(aliceId).lean();
      expect(userCheck.isDeactivated).toBe(true);
    });

    it("returns 409 for already reviewed report", async () => {
      const res = await request(app)
        .put(`/api/moderation/reports/${messageReportId}/review`)
        .set("Authorization", `Bearer ${modToken}`)
        .send({ status: "resolved" });

      expect(res.status).toBe(409);
    });

    it("returns 403 for regular user", async () => {
      const msg4Res = await request(app)
        .post("/api/chat/new-message")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ chatId, text: "Reported by mod" });

      const report4 = await request(app)
        .post("/api/moderation/report")
        .set("Authorization", `Bearer ${modToken}`)
        .send({ messageId: msg4Res.body.data._id, chatId, reason: "other" });

      const res = await request(app)
        .put(`/api/moderation/reports/${report4.body.data._id}/review`)
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ status: "resolved" });

      expect(res.status).toBe(403);
    });

    it("returns 404 for non-existent report", async () => {
      const res = await request(app)
        .put("/api/moderation/reports/000000000000000000000000/review")
        .set("Authorization", `Bearer ${modToken}`)
        .send({ status: "resolved" });

      expect(res.status).toBe(404);
    });
  });

  describe("Reporter notification", () => {
    it("creates a notification for the reporter after review", async () => {
      const reporterUser = await User.findOne({ email: "bob@example.com" }).lean();
      const notifs = await Notification.find({ recipient: reporterUser._id }).lean();
      expect(notifs.length).toBeGreaterThan(0);
      expect(notifs.some((n) => n.message && n.message.includes("report"))).toBe(true);
    });
  });
});

describe("Moderation — Spam Detection", () => {
  describe("Rate limiting", () => {
    it("flags message as spam after exceeding rate limit", async () => {
      const spammerHashed = await bcrypt.hash("SpamPass1", 12);
      const spammer = await User.create({ firstname: "Spam", lastname: "Bot", email: "spammer@example.com", password: spammerHashed });
      const spammerLogin = await request(app).post("/api/auth/login").send({ email: "spammer@example.com", password: "SpamPass1" });
      const spammerToken = spammerLogin.body.token;

      const spamChat = await request(app)
        .post("/api/chat/create-new-chat")
        .set("Authorization", `Bearer ${spammerToken}`)
        .send({ members: [modId] });

      const spamChatId = spamChat.body.data._id;

      for (let i = 0; i < 12; i++) {
        await request(app)
          .post("/api/chat/new-message")
          .set("Authorization", `Bearer ${spammerToken}`)
          .send({ chatId: spamChatId, text: `Spam message ${i}` });
      }

      await new Promise((r) => setTimeout(r, 500));

      const lastMsg = await Message.findOne({ chatId: spamChatId, sender: spammer._id }).sort({ createdAt: -1 }).lean();
      expect(lastMsg).toBeTruthy();
    });
  });

  describe("Content spam detection", () => {
    it("detects excessive URLs", async () => {
      const spammerHashed = await bcrypt.hash("ContentSpam1", 12);
      const spammer = await User.create({ firstname: "Content", lastname: "Spammer", email: "contentspam@example.com", password: spammerHashed });
      const spammerLogin = await request(app).post("/api/auth/login").send({ email: "contentspam@example.com", password: "ContentSpam1" });
      const spammerToken = spammerLogin.body.token;

      const spamChat = await request(app)
        .post("/api/chat/create-new-chat")
        .set("Authorization", `Bearer ${spammerToken}`)
        .send({ members: [modId] });

      const spamChatId = spamChat.body.data._id;

      const res = await request(app)
        .post("/api/chat/new-message")
        .set("Authorization", `Bearer ${spammerToken}`)
        .send({ chatId: spamChatId, text: "Visit https://a.com and https://b.com and https://c.com for deals" });

      expect(res.status).toBe(201);
    });

    it("detects excessive caps", async () => {
      const spammerHashed = await bcrypt.hash("CapsSpam1", 12);
      const spammer = await User.create({ firstname: "Caps",lastname: "Spammer", email: "capsspam@example.com", password: spammerHashed });
      const spammerLogin = await request(app).post("/api/auth/login").send({ email: "capsspam@example.com", password: "CapsSpam1" });
      const spammerToken = spammerLogin.body.token;

      const spamChat = await request(app)
        .post("/api/chat/create-new-chat")
        .set("Authorization", `Bearer ${spammerToken}`)
        .send({ members: [modId] });

      const spamChatId = spamChat.body.data._id;

      const res = await request(app)
        .post("/api/chat/new-message")
        .set("Authorization", `Bearer ${spammerToken}`)
        .send({ chatId: spamChatId, text: "THIS IS ALL CAPS SPAM MESSAGE WITH EXCESSIVE CAPITALIZATION" });

      expect(res.status).toBe(201);
    });

    it("detects excessive emojis", async () => {
      const spammerHashed = await bcrypt.hash("EmojiSpam1", 12);
      const spammer = await User.create({ firstname: "Emoji", lastname: "Spammer", email: "emojispam@example.com", password: spammerHashed });
      const spammerLogin = await request(app).post("/api/auth/login").send({ email: "emojispam@example.com", password: "EmojiSpam1" });
      const spammerToken = spammerLogin.body.token;

      const spamChat = await request(app)
        .post("/api/chat/create-new-chat")
        .set("Authorization", `Bearer ${spammerToken}`)
        .send({ members: [modId] });

      const spamChatId = spamChat.body.data._id;

      const res = await request(app)
        .post("/api/chat/new-message")
        .set("Authorization", `Bearer ${spammerToken}`)
        .send({ chatId: spamChatId, text: "🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥💰💰💰💰💰💰💰💰" });

      expect(res.status).toBe(201);
    });

    it("does not flag normal messages as spam", async () => {
      const normalHashed = await bcrypt.hash("NormalPass1", 12);
      const normal = await User.create({ firstname: "Normal", lastname: "User", email: "normal@example.com", password: normalHashed });
      const normalLogin = await request(app).post("/api/auth/login").send({ email: "normal@example.com", password: "NormalPass1" });
      const normalToken = normalLogin.body.token;

      const normalChat = await request(app)
        .post("/api/chat/create-new-chat")
        .set("Authorization", `Bearer ${normalToken}`)
        .send({ members: [modId] });

      const normalChatId = normalChat.body.data._id;

      const res = await request(app)
        .post("/api/chat/new-message")
        .set("Authorization", `Bearer ${normalToken}`)
        .send({ chatId: normalChatId, text: "Hey, how are you doing today?" });

      expect(res.status).toBe(201);

      await new Promise((r) => setTimeout(r, 500));

      const msg = await Message.findById(res.body.data._id).lean();
      expect(msg.spamFlag).toBe(false);
    });
  });
});

describe("Moderation — User Mute (no chatId)", () => {
  it("mutes user across all chats when chatId is null", async () => {
    const targetHashed = await bcrypt.hash("MuteTarget1", 12);
    const target = await User.create({ firstname: "Mute", lastname: "Target", email: "mutetarget@example.com", password: targetHashed });
    const targetLogin = await request(app).post("/api/auth/login").send({ email: "mutetarget@example.com", password: "MuteTarget1" });
    const targetToken = targetLogin.body.token;

    const muteChat = await request(app)
      .post("/api/chat/create-new-chat")
      .set("Authorization", `Bearer ${targetToken}`)
      .send({ members: [aliceId] });

    const muteChatId = muteChat.body.data._id;

    const report = await request(app)
      .post("/api/moderation/report/user")
      .set("Authorization", `Bearer ${bobToken}`)
      .send({ userId: target._id.toString(), reason: "harassment" });

    const res = await request(app)
      .put(`/api/moderation/reports/${report.body.data._id}/review`)
      .set("Authorization", `Bearer ${modToken}`)
      .send({ status: "resolved", action: "user_muted" });

    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe("user_muted");

    const participant = await Participant.findOne({ chatId: muteChatId, userId: target._id }).lean();
    expect(participant).toBeTruthy();
    expect(participant.muted).toBe(true);
    expect(participant.mutedUntil).toBeTruthy();
  });
});
