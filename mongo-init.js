# ── MongoDB init script (runs on first boot) ───────────────────────────────────
db = db.getSiblingDB("nuvora");

// Create application user with read-write access
db.createUser({
  user: "nuvora",
  pwd: "nuvora_secure_pass",
  roles: [
    { role: "readWrite", db: "nuvora" },
    { role: "dbAdmin", db: "nuvora" },
  ],
});

// Create collections explicitly (for replica set readiness)
db.createCollection("users");
db.createCollection("posts");
db.createCollection("comments");
db.createCollection("chats");
db.createCollection("messages");
db.createCollection("notifications");
db.createCollection("follows");

// Compound indexes
db.posts.createIndex({ visibility: 1, createdAt: -1 });
db.posts.createIndex({ author: 1, createdAt: -1 });
db.posts.createIndex({ tags: 1, createdAt: -1 });
db.users.createIndex({ email: 1 }, { unique: true });
db.chats.createIndex({ members: 1 });
db.messages.createIndex({ chatId: 1, createdAt: -1 });
db.notifications.createIndex({ recipient: 1, createdAt: -1 });
db.follows.createIndex({ follower: 1, following: 1 }, { unique: true });

print("JULO MongoDB initialized successfully");
