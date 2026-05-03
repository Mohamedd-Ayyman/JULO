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
  text: z.string().trim().min(1, "Message cannot be empty").max(2000),
  receiverId: z.string().optional(),
});

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
