import mongoose from "mongoose";

const pushTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    platform: {
      type: String,
      enum: ["ios", "android", "web"],
      required: true,
    },
    deviceInfo: {
      type: {
        os: String,
        osVersion: String,
        appVersion: String,
        deviceName: String,
      },
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

pushTokenSchema.index({ userId: 1, active: 1 });
pushTokenSchema.index({ active: 1, lastUsedAt: -1 });

const PushToken = mongoose.model("push_tokens", pushTokenSchema);
export default PushToken;
