import mongoose from "mongoose";

const CALL_STATUS = ["ringing", "active", "ended", "missed", "rejected"];
const CALL_TYPE = ["audio", "video"];
const END_REASON = ["normal", "timeout", "cancelled", "failed"];

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
    consentToRecording: { type: Boolean, default: false },
    consentUpdatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const callSessionSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chats",
      required: true,
    },

    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
    },

    // ── Participants ───────────────────────────────────────────────────
    participants: {
      type: [participantSchema],
      validate: {
        validator: (v) => v.length >= 1 && v.length <= 10,
        message: "Call must have 1-10 participants",
      },
    },

    // ── Call state ─────────────────────────────────────────────────────
    status: {
      type: String,
      enum: CALL_STATUS,
      default: "ringing",
    },

    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    duration: { type: Number, default: null, min: 0 },

    // ── Recording ──────────────────────────────────────────────────────
    isRecording: { type: Boolean, default: false },
    recordingStartedAt: { type: Date, default: null },
    recordingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "recordings",
      default: null,
    },

    // ── Metadata ───────────────────────────────────────────────────────
    callType: {
      type: String,
      enum: CALL_TYPE,
      default: "audio",
    },

    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },

    endReason: {
      type: String,
      enum: END_REASON,
      default: "normal",
    },
  },
  { timestamps: true }
);

callSessionSchema.index({ chatId: 1, createdAt: -1 });
callSessionSchema.index({ "participants.userId": 1, createdAt: -1 });
callSessionSchema.index({ status: 1 });
callSessionSchema.index({ recordingId: 1 });
callSessionSchema.index({ tenantId: 1 });

const CallSession = mongoose.model("call_sessions", callSessionSchema);
export { CALL_STATUS, CALL_TYPE, END_REASON };
export default CallSession;
