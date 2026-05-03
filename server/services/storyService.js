import Story from "../models/story.js";
import logger from "../utils/logger.js";

export class StoryService {
  /**
   * Create a new story. Expires in 24 hours from creation.
   */
  async createStory({ userId, tenantId, mediaUrl, mediaType = "image" }) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const story = await Story.create({ userId, tenantId, mediaUrl, mediaType, expiresAt });
    logger.info(`[Story] Created: ${story._id} by user ${userId} — expires ${expiresAt.toISOString()}`);
    return story;
  }

  /**
   * Get all active (unexpired) stories grouped by user.
   * Optimised: one aggregation, latest story per user, viewer tracking.
   */
  async getStoriesForFeed(currentUserId) {
    const stories = await Story.getStoriesForFeed(currentUserId);
    return stories;
  }

  /**
   * Get all stories belonging to the current user (for "Your story" UI).
   */
  async getMyStories(userId) {
    const now = new Date();
    return Story.find({ userId, expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Mark a story as viewed by a user.
   * Idempotent: no error if already viewed.
   */
  async markViewed(storyId, viewerId) {
    const story = await Story.findByIdAndUpdate(
      storyId,
      { $addToSet: { viewers: viewerId } },
      { new: true }
    );
    if (!story) {
      const err = new Error("Story not found");
      err.statusCode = 404;
      throw err;
    }
    logger.debug(`[Story] ${viewerId} viewed story ${storyId}`);
    return story;
  }

  /**
   * Delete a story (owner only).
   */
  async deleteStory(storyId, userId) {
    const story = await Story.findOneAndDelete({ _id: storyId, userId });
    if (!story) {
      const err = new Error("Story not found or not authorized");
      err.statusCode = 404;
      throw err;
    }
    logger.info(`[Story] Deleted: ${storyId} by user ${userId}`);
    return { deleted: true };
  }

  /**
   * Delete all stories for a user (used on account deletion).
   */
  async deleteUserStories(userId) {
    const result = await Story.deleteMany({ userId });
    logger.info(`[Story] Deleted ${result.deletedCount} stories for user ${userId}`);
    return { deletedCount: result.deletedCount };
  }
}

export default new StoryService();