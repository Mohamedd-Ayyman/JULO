import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    viewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    }],
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

/** TTL index: MongoDB auto-deletes stories 24h after expiry timestamp */
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/** Compound index for efficient "my stories" and "feed stories" queries */
storySchema.index({ userId: 1, expiresAt: 1 });

/** Optimised stories feed: group by user, return latest, filter unexpired */
storySchema.statics.getStoriesForFeed = async function (currentUserId) {
  const now = new Date();
  const stories = await this.aggregate([
    { $match: { expiresAt: { $gt: now } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$userId",
        stories: { $push: { _id: "$_id", mediaUrl: "$mediaUrl", mediaType: "$mediaType", createdAt: "$createdAt", viewers: "$viewers" } },
        latestStory: { $first: "$$ROOT" },
        hasUnseen: {
          $max: {
            $cond: [{ $and: [{ $gt: ["$createdAt", now] }, { $not: { $in: [currentUserId, "$viewers"] } }] }, 1, 0],
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
        pipeline: [{ $project: { firstname: 1, lastname: 1, profilepic: 1 } }],
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
    { $sort: { "latestStory.createdAt": -1 } },
  ]);
  return stories;
};

const Story = mongoose.model("stories", storySchema);
export default Story;
