import mongoose from "mongoose";

const RECORDING_TYPES = ["voice_message", "call_recording", "audio_note"];
const RECORDING_STATUS = ["processing", "ready", "failed", "deleted"];

const recordingSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chats",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
    },

    // ── File metadata ─────────────────────────────────────────────────
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: null },
    format: { type: String, default: null },

    // ── Duration (seconds) ────────────────────────────────────────────
    duration: { type: Number, required: true, min: 0 },

    // ── Participants (denormalized from chat.members) ─────────────────
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    }],

    // ── Rich metadata ─────────────────────────────────────────────────
    title: { type: String, maxlength: 200, default: null },
    description: { type: String, maxlength: 1000, default: null },
    thumbnailUrl: { type: String, default: null },
    transcription: { type: String, maxlength: 10000, default: null },
    tags: {
      type: [String],
      validate: {
        validator: (v) => v.length <= 10,
        message: "Maximum 10 tags allowed",
      },
      default: [],
    },

    // ── Recording context ─────────────────────────────────────────────
    type: {
      type: String,
      enum: RECORDING_TYPES,
      default: "voice_message",
    },

    // ── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: RECORDING_STATUS,
      default: "ready",
    },

    // ── Timestamps ────────────────────────────────────────────────────
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },

    // ── Retention ─────────────────────────────────────────────────────
    retentionExpiresAt: { type: Date, default: null },
    callSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "call_sessions",
      default: null,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
  },
  { timestamps: true }
);

recordingSchema.index({ chatId: 1, createdAt: -1 });
recordingSchema.index({ sender: 1, createdAt: -1 });
recordingSchema.index({ tenantId: 1 });
recordingSchema.index({ participants: 1 });
recordingSchema.index({ status: 1 });
recordingSchema.index({ retentionExpiresAt: 1 }, { sparse: true });
recordingSchema.index({ callSessionId: 1 });

const Recording = mongoose.model("recordings", recordingSchema);
export { RECORDING_TYPES, RECORDING_STATUS };
export default Recording;
