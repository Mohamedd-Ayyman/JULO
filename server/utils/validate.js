import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  firstname: z.string().trim().min(1, "First name is required").max(60),
  lastname: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().email("Valid email is required").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// ── Posts ────────────────────────────────────────────────────────────────────────
export const postCreateSchema = z.object({
  text: z.string().trim().max(500).optional(),
  image: z.string().url().or(z.literal(null)).optional(),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
  visibility: z.enum(["public", "followers", "private"]).optional(),
}).refine((d) => d.text?.trim() || d.image, { message: "Post must have text or image" });

export const commentSchema = z.object({
  text: z.string().trim().min(1, "Comment text is required").max(280),
  parentComment: z.string().optional().nullable(),
});

// ── Recording ────────────────────────────────────────────────────────────────────
export const recordingCreateSchema = z.object({
  chatId: z.string().min(1, "chatId is required"),
  fileUrl: z.string().url("Valid file URL is required"),
  duration: z.number().min(0, "Duration must be non-negative"),
  fileSize: z.number().min(0).optional(),
  mimeType: z.string().optional(),
  format: z.string().optional(),
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  transcription: z.string().max(10000).optional(),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
  type: z.enum(["voice_message", "call_recording", "audio_note"]).optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
});

export const recordingUpdateSchema = z.object({
  title: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  transcription: z.string().max(10000).optional().nullable(),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "At least one field must be provided" });

// ── Chat ──────────────────────────────────────────────────────────────────────────
export const chatCreateSchema = z.object({
  members: z.array(z.string()).min(1, "At least one member required").max(100),
  type: z.enum(["direct", "group", "channel"]).optional(),
  name: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  icon: z.string().url().optional().nullable(),
});

export const chatUpdateSchema = z.object({
  name: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  icon: z.string().url().optional().nullable(),
}).refine((d) => d.name !== undefined || d.description !== undefined || d.icon !== undefined, {
  message: "At least one field must be provided",
});

// ── Participant ──────────────────────────────────────────────────────────────────
export const participantAddSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user required").max(50),
  role: z.enum(["admin", "moderator", "member"]).optional(),
});

export const participantRoleSchema = z.object({
  role: z.enum(["admin", "moderator", "member"]),
});

export const participantMuteSchema = z.object({
  muted: z.boolean(),
  mutedUntil: z.string().datetime().optional().nullable(),
});

export const participantArchiveSchema = z.object({
  archived: z.boolean(),
});

export const participantPinSchema = z.object({
  pinned: z.boolean(),
});

export const participantNicknameSchema = z.object({
  nickname: z.string().trim().max(50).optional().nullable(),
});

export const participantNotificationsSchema = z.object({
  enabled: z.boolean(),
});

// ── Conversation list ─────────────────────────────────────────────────────────
export const conversationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.enum(["direct", "group", "channel"]).optional(),
  archived: z.coerce.boolean().optional().default(false),
  search: z.string().trim().max(100).optional(),
});

// ── Message threading ────────────────────────────────────────────────────────────
export const messageEditSchema = z.object({
  text: z.string().trim().min(1, "Text is required").max(2000),
});

export const mentionSearchQuerySchema = z.object({
  q: z.string().trim().max(60).optional().default(""),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

export const mentionedMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const messageQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  before: z.string().optional(),
  after: z.string().optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  messageType: z.enum(["text", "encrypted", "file", "system", "key_exchange"]).optional(),
  search: z.string().trim().max(200).optional(),
});

export const messageReplySchema = z.object({
  chatId: z.string().min(1, "chatId is required"),
  replyTo: z.string().min(1, "replyTo message ID is required"),
  text: z.string().trim().max(2000).optional(),
  audioUrl: z.string().url().optional(),
  audioDuration: z.number().min(0).optional(),
  imageUrl: z.string().url().optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().min(0).optional(),
  mimeType: z.string().max(100).optional(),
  encryptedContent: z.string().optional(),
  iv: z.string().optional(),
  authTag: z.string().optional(),
  keyId: z.string().optional(),
}).refine((d) => d.text?.trim() || d.audioUrl || d.encryptedContent || d.imageUrl || d.fileUrl, {
  message: "Message must have text, audio, file, image, or encrypted content",
});

export const messageForwardSchema = z.object({
  messageId: z.string().min(1, "messageId is required"),
  targetChatId: z.string().min(1, "targetChatId is required"),
});

// ── Delivery & Receipts ───────────────────────────────────────────────────────
export const deliveryAckSchema = z.object({
  messageId: z.string().min(1, "messageId is required"),
  chatId: z.string().min(1, "chatId is required"),
});

export const batchDeliveryAckSchema = z.object({
  messageIds: z.array(z.string()).min(1, "At least one messageId required").max(100),
  chatId: z.string().min(1, "chatId is required"),
});

// ── Last Seen ─────────────────────────────────────────────────────────────────
export const lastSeenQuerySchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

// ── Profile ──────────────────────────────────────────────────────────────────────
export const profileUpdateSchema = z.object({
  firstname: z.string().trim().min(1).max(60).optional(),
  lastname: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(160).optional().nullable(),
  coverImage: z.string().url().or(z.literal(null)).optional().nullable(),
}).refine((d) => d.firstname !== undefined || d.lastname !== undefined || d.bio !== undefined || d.coverImage !== undefined, {
  message: "At least one field must be provided",
});

// ── Consent ─────────────────────────────────────────────────────────────────────
export const consentUpdateSchema = z.object({
  consents: z.array(z.object({
    consentType: z.enum([
      "recording",
      "location_sharing",
      "analytics",
      "marketing",
      "third_party_sharing",
      "data_processing",
      "push_notifications",
      "profile_indexing",
    ]),
    granted: z.boolean(),
  })).min(1, "At least one consent must be provided"),
});

export const consentGrantSchema = z.object({
  version: z.string().optional(),
});

export const consentRevokeSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ── Privacy ─────────────────────────────────────────────────────────────────────
export const privacySettingsSchema = z.object({
  isPrivate: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  allowMessageRequests: z.boolean().optional(),
  storyVisibility: z.enum(["everyone", "followers", "close_friends"]).optional(),
  dataClassification: z.enum(["standard", "sensitive", "confidential"]).optional(),
  privacyLevel: z.enum(["standard", "enhanced", "maximum"]).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "At least one field must be provided" });

// ── E2E Encryption ─────────────────────────────────────────────────────────────
export const identityKeyUploadSchema = z.object({
  publicKey: z.string().min(1, "Public key is required"),
  signature: z.string().min(1, "Signature is required"),
});

export const signedPreKeyUploadSchema = z.object({
  keyId: z.number().int().positive(),
  publicKey: z.string().min(1, "Public key is required"),
  privateKey: z.string().min(1, "Private key is required"),
  signature: z.string().min(1, "Signature is required"),
});

export const oneTimePreKeysUploadSchema = z.object({
  preKeys: z.array(z.object({
    keyId: z.number().int().positive(),
    publicKey: z.string().min(1, "Public key is required"),
    privateKey: z.string().min(1, "Private key is required"),
  })).min(1, "At least one pre-key is required").max(100, "Maximum 100 pre-keys per batch"),
});

export const encryptionSessionCreateSchema = z.object({
  chatId: z.string().min(1, "chatId is required"),
  partnerId: z.string().min(1, "partnerId is required"),
  sessionData: z.string().min(1, "sessionData is required"),
  rootKey: z.string().min(1, "rootKey is required"),
  chainKey: z.string().min(1, "chainKey is required"),
});

export const encryptionSessionUpdateSchema = z.object({
  messageNumber: z.number().int().min(0).optional(),
  previousChainLength: z.number().int().min(0).optional(),
  rootKey: z.string().optional(),
  chainKey: z.string().optional(),
  sendingKey: z.string().optional().nullable(),
  receivingKey: z.string().optional().nullable(),
  sessionData: z.string().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "At least one field must be provided" });

export const encryptedMessageSchema = z.object({
  chatId: z.string().min(1, "chatId is required"),
  receiverId: z.string().min(1, "receiverId is required"),
  encryptedContent: z.string().min(1, "encryptedContent is required"),
  iv: z.string().min(1, "iv is required"),
  authTag: z.string().optional(),
  keyId: z.string().optional(),
  ephemeralPublicKey: z.string().optional(),
  ratchetStep: z.number().int().min(0).optional(),
  messageType: z.enum(["encrypted", "file", "system", "key_exchange"]).optional(),
});

export const keyRotationSchema = z.object({
  chatId: z.string().optional(),
  newSessionData: z.string().optional(),
  newRootKey: z.string().optional(),
  newChainKey: z.string().optional(),
}).refine((d) => d.chatId || d.newRootKey || d.newChainKey, {
  message: "At least one of chatId, newRootKey, or newChainKey must be provided",
});

// ── Audit ───────────────────────────────────────────────────────────────────────
export const auditQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.enum([
    "create", "read", "update", "delete", "export", "share",
    "consent_grant", "consent_revoke", "login", "logout",
    "password_change", "account_deactivate", "account_delete",
  ]).optional(),
  resource: z.enum([
    "user", "post", "message", "chat", "consent",
    "session", "notification", "story", "upload", "billing",
    "identity_key", "pre_key", "signed_pre_key", "encryption_session",
  ]).optional(),
  resourceId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// ── Message (updated to support encrypted) ─────────────────────────────────────
export const messageSchema = z.object({
  chatId: z.string().min(1, "chatId is required"),
  text: z.string().trim().max(2000).optional(),
  audioUrl: z.string().url().optional(),
  audioDuration: z.number().min(0).optional(),
  imageUrl: z.string().url().optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().min(0).optional(),
  mimeType: z.string().max(100).optional(),
  linkPreview: z.object({
    title: z.string().max(500).optional(),
    description: z.string().max(1000).optional(),
    image: z.string().url().optional(),
    url: z.string().url().optional(),
    siteName: z.string().max(200).optional(),
  }).optional().nullable(),
  receiverId: z.string().optional(),
  encryptedContent: z.string().optional(),
  iv: z.string().optional(),
  authTag: z.string().optional(),
  keyId: z.string().optional(),
  ephemeralPublicKey: z.string().optional(),
  ratchetStep: z.number().int().min(0).optional(),
  messageType: z.enum(["text", "encrypted", "file", "system", "key_exchange"]).optional(),
}).refine((d) => d.text?.trim() || d.audioUrl || d.encryptedContent || d.imageUrl || d.fileUrl, {
  message: "Message must have text, audio, file, image, or encrypted content",
});

// ── Media ──────────────────────────────────────────────────────────────────────
export const mediaQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  mediaType: z.enum(["image", "audio", "file"]).optional(),
});

export const mediaUploadSchema = z.object({
  chatId: z.string().min(1, "chatId is required").optional(),
});

// ── Middleware factory ────────────────────────────────────────────────────────────
export const validate = (schema, mode = "body") => (req, res, next) => {
  const source = mode === "query" ? req.query : req.body;
  const result = schema.safeParse(source);
  if (!result.success) {
    const msg = result.error.errors[0]?.message || "Validation failed";
    return res.status(400).send({ success: false, message: msg, statusCode: 400 });
  }
  if (mode === "query") {
    req.query = result.data;
  } else {
    req.body = result.data;
  }
  next();
};
