import request from "supertest";
import User from "../models/user.js";
import Post from "../models/post.js";
import Comment from "../models/comment.js";
import app from "../app.js";

let authToken;
let testUser;

beforeAll(async () => {
  await Post.deleteMany({});
  await Comment.deleteMany({});
  await User.deleteMany({});

  // Create a test user and get token
  const hashed = await bcrypt.hash("TestPassword1", 12);
  testUser = await User.create({ firstname: "Post", lastname: "Author", email: "postuser@example.com", password: hashed });

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "postuser@example.com", password: "TestPassword1" });

  authToken = loginRes.body.token;
});

afterAll(async () => {
  await Post.deleteMany({});
  await User.deleteMany({});
});

describe("Post Routes", () => {
  // ── POST /api/post/create ───────────────────────────────────────────────────
  describe("POST /api/post/create", () => {
    it("returns 201 when post has text", async () => {
      const res = await request(app)
        .post("/api/post/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Hello world from JULO!", visibility: "public" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.text).toBe("Hello world from JULO!");
      expect(res.body.data.author._id || res.body.data.author).toBeDefined();
    });

    it("returns 201 when post has image URL", async () => {
      const res = await request(app)
        .post("/api/post/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ image: "https://example.com/image.jpg", text: "" });

      expect(res.status).toBe(201);
      expect(res.body.data.image).toBe("https://example.com/image.jpg");
    });

    it("returns 400 when post has neither text nor image", async () => {
      const res = await request(app)
        .post("/api/post/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "", image: null });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 without auth token", async () => {
      const res = await request(app)
        .post("/api/post/create")
        .send({ text: "Unauthorized post" });

      expect(res.status).toBe(401);
    });

    it("returns 400 when text exceeds 500 chars", async () => {
      const longText = "a".repeat(501);
      const res = await request(app)
        .post("/api/post/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: longText });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 when visibility is invalid", async () => {
      const res = await request(app)
        .post("/api/post/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "test", visibility: "invalid" });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/post/feed ──────────────────────────────────────────────────────
  describe("GET /api/post/feed", () => {
    it("returns 200 with paginated feed", async () => {
      const res = await request(app)
        .get("/api/post/feed?page=1&limit=10")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.total).toBe("number");
    });
  });

  // ── POST /api/post/:postId/comment ─────────────────────────────────────────
  describe("POST /api/post/:postId/comment", () => {
    let createdPost;

    beforeAll(async () => {
      const postRes = await request(app)
        .post("/api/post/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Post for comment test" });
      createdPost = postRes.body.data._id;
    });

    it("returns 201 when comment is valid", async () => {
      const res = await request(app)
        .post(`/api/post/${createdPost}/comment`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Great post!" });

      expect(res.status).toBe(201);
      expect(res.body.data.text).toBe("Great post!");
    });

    it("returns 404 when post does not exist", async () => {
      const fakeId = "000000000000000000000000";
      const res = await request(app)
        .post(`/api/post/${fakeId}/comment`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "This should fail" });

      expect(res.status).toBe(404);
    });

    it("returns 400 when comment text is empty", async () => {
      const res = await request(app)
        .post(`/api/post/${createdPost}/comment`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "" });

      expect(res.status).toBe(400);
    });
  });

  // ── PUT /api/post/:postId/like ───────────────────────────────────────────────
  describe("PUT /api/post/:postId/like", () => {
    it("toggles like — likes then unlikes", async () => {
      const postRes = await request(app)
        .post("/api/post/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Like test post" });

      const postId = postRes.body.data._id;

      const like1 = await request(app)
        .put(`/api/post/${postId}/like`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(like1.status).toBe(200);
      expect(like1.body.data.liked).toBe(true);
      expect(like1.body.data.likeCount).toBe(1);

      const like2 = await request(app)
        .put(`/api/post/${postId}/like`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(like2.status).toBe(200);
      expect(like2.body.data.liked).toBe(false);
      expect(like2.body.data.likeCount).toBe(0);
    });
  });

  // ── DELETE /api/post/:postId ────────────────────────────────────────────────
  describe("DELETE /api/post/:postId", () => {
    it("deletes own post", async () => {
      const postRes = await request(app)
        .post("/api/post/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Post to delete" });

      const postId = postRes.body.data._id;

      const delRes = await request(app)
        .delete(`/api/post/${postId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });

    it("returns 401 trying to delete another user's post", async () => {
      // Create another user
      const hashed = await bcrypt.hash("OtherPass1", 12);
      const otherUser = await User.create({ firstname: "Other", lastname: "User", email: "other@example.com", password: hashed });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "other@example.com", password: "OtherPass1" });

      const otherToken = loginRes.body.token;

      // Create post as testUser
      const postRes = await request(app)
        .post("/api/post/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Only I can delete this" });

      const postId = postRes.body.data._id;

      // Try to delete as otherUser
      const delRes = await request(app)
        .delete(`/api/post/${postId}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(delRes.status).toBe(403);
      expect(delRes.body.success).toBe(false);
    });
  });
});
