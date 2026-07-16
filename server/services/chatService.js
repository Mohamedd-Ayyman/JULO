import mongoose from "mongoose";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import { scopeByTenant } from "../middlewares/tenantMiddleware.js";
import { checkUsageLimit, incrementUsage, decrementUsage } from "../middlewares/tenantMiddleware.js";
import logger from "../utils/logger.js";

const canUseTransactions = () => {
  const type = mongoose.connection?.client?.topology?.description?.type;
  return type === "ReplicaSetWithPrimary" || type === "Sharded";
};

export class ChatService {
  async createOrFind(currentUserId, tenantId, members) {
    if (members.some((m) => String(m) === String(currentUserId))) {
      const err = new Error("Cannot create a chat with yourself");
      err.statusCode = 400;
      throw err;
    }

    // For 1-on-1 chats, check for existing (scoped to tenant if applicable)
    if (members.length === 1) {
      let baseQuery = Chat.findOne({ members: { $all: [currentUserId, ...members] } });
      baseQuery = scopeByTenant(baseQuery, tenantId);
      const existing = await baseQuery;
      if (existing) return existing;
    }

    const chat = new Chat({ members: [currentUserId, ...members], tenantId });
    await chat.save();
    logger.info(`[Chat] Created: ${chat._id}`);
    return chat;
  }

  async getAllForUser(userId, tenantId) {
    let baseQuery = Chat.find({ members: { $in: userId } });
    baseQuery = scopeByTenant(baseQuery, tenantId);
    return baseQuery
      .populate("members", "firstname lastname email profilepic isOnline lastSeen")
      .populate("lastMessage")
      .sort({ updatedAt: -1 })
      .lean();
  }

  async getMessages(chatId, userId, { page = 1, limit = 50 } = {}) {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      const err = new Error("Chat not found");
      err.statusCode = 404;
      throw err;
    }
    if (!chat.members.some((m) => String(m) === String(userId))) {
      const err = new Error("Not a member of this chat");
      err.statusCode = 403;
      throw err;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [messages, total] = await Promise.all([
      Message.find({ chatId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("sender", "firstname lastname profilepic")
        .lean(),
      Message.countDocuments({ chatId }),
    ]);
    return { messages, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async sendMessage(chatId, senderId, tenantId, { text, audioUrl, audioDuration, receiverId } = {}) {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      const err = new Error("Chat not found");
      err.statusCode = 404;
      throw err;
    }
    if (!chat.members.some((m) => String(m) === String(senderId))) {
      const err = new Error("Not a member of this chat");
      err.statusCode = 403;
      throw err;
    }

    const messageData = { chatId, sender: senderId, tenantId, text: text || "", receiverId, read: false };
    if (audioUrl) {
      messageData.audioUrl = audioUrl;
      messageData.audioDuration = audioDuration || null;
    }

    // Atomic transaction: message + chat lastMessage update (only if supported)
    if (!canUseTransactions()) {
      const message = new Message(messageData);
      await message.save();
      await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id, $inc: { unreadMessageCount: 1 } });
      logger.info(`[Message] Sent: ${message._id} in chat ${chatId}`);
      return Message.findById(message._id).populate("sender", "firstname lastname profilepic");
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const message = new Message(messageData);
      await message.save({ session });

      await Chat.findByIdAndUpdate(
        chatId,
        { lastMessage: message._id, $inc: { unreadMessageCount: 1 } },
        { session }
      );

      await session.commitTransaction();
      logger.info(`[Message] Sent: ${message._id} in chat ${chatId}`);
      return Message.findById(message._id).populate("sender", "firstname lastname profilepic");
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async markRead(chatId, userId) {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      const err = new Error("Chat not found");
      err.statusCode = 404;
      throw err;
    }
    if (!chat.members.some((m) => String(m) === String(userId))) {
      const err = new Error("Not a member of this chat");
      err.statusCode = 403;
      throw err;
    }
    await Message.updateMany(
      { chatId, sender: { $ne: userId }, read: false },
      { $set: { read: true } }
    );
    await Chat.findByIdAndUpdate(chatId, { unreadMessageCount: 0 });
  }

  async editMessage(messageId, userId, text) {
    const message = await Message.findById(messageId);
    if (!message) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }
    if (String(message.sender) !== String(userId)) {
      const err = new Error("You can only edit your own messages");
      err.statusCode = 403;
      throw err;
    }
    if (message.deleted) {
      const err = new Error("Cannot edit a deleted message");
      err.statusCode = 400;
      throw err;
    }
    message.text = text;
    message.edited = true;
    await message.save();
    return Message.findById(message._id).populate("sender", "firstname lastname profilepic");
  }

  async deleteMessage(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }
    if (String(message.sender) !== String(userId)) {
      const err = new Error("You can only delete your own messages");
      err.statusCode = 403;
      throw err;
    }
    message.text = "[deleted]";
    message.deleted = true;
    message.edited = false;
    await message.save();
    logger.info(`[Message] Deleted: ${messageId}`);
  }

  async addReaction(messageId, userId, emoji) {
    const message = await Message.findById(messageId);
    if (!message) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }
    const reactions = message.reactions || {};
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].findIndex((u) => String(u) === String(userId));
    if (idx > -1) {
      reactions[emoji].splice(idx, 1);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji].push(userId);
    }
    message.reactions = reactions;
    await message.save();
    return Message.findById(message._id).populate("sender", "firstname lastname profilepic");
  }

  async deleteUserChats(userId) {
    const chats = await Chat.find({ members: userId });
    const chatIds = chats.map((c) => c._id);
    await Message.deleteMany({ chatId: { $in: chatIds } });
    await Chat.deleteMany({ members: userId });
    logger.info(`[Chat] Deleted ${chats.length} chats and associated messages for user ${userId}`);
    return { deletedChats: chats.length };
  }
}

export default new ChatService();
