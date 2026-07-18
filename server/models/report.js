import mongoose from "mongoose";

const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "inappropriate_content",
  "impersonation",
  "other",
];

const REPORT_STATUSES = ["pending", "reviewed", "dismissed", "resolved"];

const REPORT_ACTIONS = ["none", "warning", "message_deleted", "user_muted", "user_banned"];

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["message", "user"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chats",
      default: null,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
      default: "",
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    action: {
      type: String,
      enum: REPORT_ACTIONS,
      default: "none",
    },
    actionNote: {
      type: String,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, tenantId: 1 });
reportSchema.index({ reporterId: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ chatId: 1, status: 1 });

const Report = mongoose.model("reports", reportSchema);
export { REPORT_REASONS, REPORT_STATUSES, REPORT_ACTIONS };
export default Report;
