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

// ── Messages ─────────────────────────────────────────────────────────────────────
export const messageSchema = z.object({
  chatId: z.string().min(1, "chatId is required"),
  text: z.string().trim().max(2000).optional(),
  audioUrl: z.string().url().optional(),
  audioDuration: z.number().min(0).optional(),
  receiverId: z.string().optional(),
}).refine((d) => d.text?.trim() || d.audioUrl, {
  message: "Message must have text or audio",
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
  members: z.array(z.string()).min(1, "At least one member required").max(10),
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
  ]).optional(),
  resourceId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// ── Middleware factory ────────────────────────────────────────────────────────────
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const msg = result.error.errors[0]?.message || "Validation failed";
    return res.status(400).send({ success: false, message: msg, statusCode: 400 });
  }
  req.body = result.data;
  next();
};
