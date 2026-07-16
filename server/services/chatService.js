import mongoose from "mongoose";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import Participant from "../models/participant.js";
import { scopeByTenant } from "../middlewares/tenantMiddleware.js";
import logger from "../utils/logger.js";

const canUseTransactions = () => {
  const type = mongoose.connection?.client?.topology?.description?.type;
  return type === "ReplicaSetWithPrimary" || type === "Sharded";
};

export class ChatService {
  async createOrFind(currentUserId, tenantId, members, { type = "direct", name = null, description = null, icon = null } = {}) {
    if (members.some((m) => String(m) === String(currentUserId))) {
      const err = new Error("Cannot create a chat with yourself");
      err.statusCode = 400;
      throw err;
    }

    const chatType = members.length === 1 && type === "direct" ? "direct" : type;

    if (chatType === "direct" && members.length === 1) {
      let baseQuery = Chat.findOne({ members: { $all: [currentUserId, ...members] }, type: "direct" });
      baseQuery = scopeByTenant(baseQuery, tenantId);
      const existing = await baseQuery;
      if (existing) return existing;
    }

    const chat = new Chat({
      type: chatType,
      name,
      description,
      icon,
      members: [currentUserId, ...members],
      createdBy: currentUserId,
      tenantId,
    });
    await chat.save();

    await Participant.create({
      chatId: chat._id,
      userId: currentUserId,
      role: "admin",
      addedBy: currentUserId,
      tenantId,
    });

    for (const memberId of members) {
      await Participant.create({
        chatId: chat._id,
        userId: memberId,
        role: "member",
        addedBy: currentUserId,
        tenantId,
      });
    }

    logger.info(`[Chat] Created: ${chat._id} (${chatType})`);
    return chat;
  }

  async getAllForUser(userId, tenantId) {
    const participants = await Participant.find({ userId, isDeleted: false })
      .populate({
        path: "chatId",
        match: tenantId ? { tenantId } : {},
        populate: [
          { path: "lastMessage", select: "text sender createdAt messageType" },
          { path: "createdBy", select: "firstname lastname" },
        ],
      })
      .sort({ pinned: -1, updatedAt: -1 })
      .lean();

    return participants
      .filter((p) => p.chatId)
      .map((p) => ({
        ...p.chatId,
        participant: {
          _id: p._id,
          role: p.role,
          nickname: p.nickname,
          muted: p.muted,
          archived: p.archived,
          pinned: p.pinned,
          unreadCount: p.unreadCount,
          lastReadMessageId: p.lastReadMessageId,
          notificationsEnabled: p.notificationsEnabled,
          joinedAt: p.joinedAt,
        },
      }));
  }

  async getMessages(chatId, userId, { cursor = null, limit = 50, direction = "backward" } = {}) {
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

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const query = { chatId };

    if (cursor) {
      if (direction === "forward") {
        query._id = { $gt: new mongoose.Types.ObjectId(cursor) };
      } else {
        query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
      }
    }

    const sort = direction === "forward" ? { _id: 1 } : { _id: -1 };

    const messages = await Message.find(query)
      .sort(sort)
      .limit(safeLimit + 1)
      .populate("sender", "firstname lastname profilepic")
      .populate("replyTo", "text sender createdAt")
      .populate("threadRootId", "text sender createdAt")
      .lean();

    const hasMore = messages.length > safeLimit;
    if (hasMore) messages.pop();

    if (direction === "forward") messages.reverse();

    return {
      messages,
      nextCursor: direction === "backward" && hasMore ? String(messages[messages.length - 1]._id) : null,
      prevCursor: direction === "forward" && hasMore ? String(messages[0]._id) : null,
      hasMore,
    };
  }

  async getThreadReplies(messageId, userId, { page = 1, limit = 50 } = {}) {
    const rootMessage = await Message.findById(messageId).lean();
    if (!rootMessage) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }

    const chat = await Chat.findById(rootMessage.chatId).lean();
    if (!chat || !chat.members.some((m) => String(m) === String(userId))) {
      const err = new Error("Not a member of this chat");
      err.statusCode = 403;
      throw err;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [replies, total] = await Promise.all([
      Message.find({ threadRootId: messageId })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("sender", "firstname lastname profilepic")
        .lean(),
      Message.countDocuments({ threadRootId: messageId }),
    ]);

    return { rootMessage, replies, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async sendMessage(chatId, senderId, tenantId, {
    text, audioUrl, audioDuration, imageUrl, fileUrl, fileName, fileSize, mimeType,
    linkPreview, receiverId, encryptedContent, iv, authTag, keyId,
    ephemeralPublicKey, ratchetStep, messageType, replyTo
  } = {}) {
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

    const messageData = { chatId, sender: senderId, tenantId, text: text || "", read: false };

    if (replyTo) {
      const parentMessage = await Message.findById(replyTo).lean();
      if (!parentMessage || String(parentMessage.chatId) !== String(chatId)) {
        const err = new Error("Invalid replyTo message");
        err.statusCode = 400;
        throw err;
      }
      messageData.replyTo = replyTo;
      messageData.threadRootId = parentMessage.threadRootId || replyTo;
    }

    if (encryptedContent) {
      messageData.encryptedContent = encryptedContent;
      messageData.iv = iv || null;
      messageData.authTag = authTag || null;
      messageData.keyId = keyId || null;
      messageData.ephemeralPublicKey = ephemeralPublicKey || null;
      messageData.ratchetStep = ratchetStep || 0;
      messageData.messageType = messageType || "encrypted";
      messageData.text = "";
    } else if (audioUrl) {
      messageData.audioUrl = audioUrl;
      messageData.audioDuration = audioDuration || null;
    } else if (imageUrl) {
      messageData.imageUrl = imageUrl;
      messageData.messageType = "file";
    } else if (fileUrl) {
      messageData.fileUrl = fileUrl;
      messageData.fileName = fileName || null;
      messageData.fileSize = fileSize || null;
      messageData.mimeType = mimeType || null;
      messageData.messageType = "file";
    }

    if (linkPreview) {
      messageData.linkPreview = {
        title: linkPreview.title || "",
        description: linkPreview.description || "",
        image: linkPreview.image || "",
        url: linkPreview.url || "",
        siteName: linkPreview.siteName || "",
      };
    }

    if (!canUseTransactions()) {
      const message = new Message(messageData);
      await message.save();

      const updateOps = { lastMessage: message._id, $inc: { unreadMessageCount: 1 } };
      await Chat.findByIdAndUpdate(chatId, updateOps);

      if (messageData.replyTo && messageData.threadRootId) {
        await Message.findByIdAndUpdate(messageData.threadRootId, { $inc: { threadReplyCount: 1 } });
      }

      await Participant.updateMany(
        { chatId, isDeleted: false, muted: false, userId: { $ne: senderId } },
        { $inc: { unreadCount: 1 } }
      );

      logger.info(`[Message] Sent: ${message._id} in chat ${chatId}`);
      return Message.findById(message._id)
        .populate("sender", "firstname lastname profilepic")
        .populate("replyTo", "text sender createdAt");
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const message = new Message(messageData);
      await message.save({ session });

      await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id, $inc: { unreadMessageCount: 1 } }, { session });

      if (messageData.replyTo && messageData.threadRootId) {
        await Message.findByIdAndUpdate(messageData.threadRootId, { $inc: { threadReplyCount: 1 } }, { session });
      }

      await session.commitTransaction();

      await Participant.updateMany(
        { chatId, isDeleted: false, muted: false, userId: { $ne: senderId } },
        { $inc: { unreadCount: 1 } }
      );

      logger.info(`[Message] Sent: ${message._id} in chat ${chatId}`);
      return Message.findById(message._id)
        .populate("sender", "firstname lastname profilepic")
        .populate("replyTo", "text sender createdAt");
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

    const lastMessage = await Message.findOne({ chatId }).sort({ createdAt: -1 }).lean();

    await Message.updateMany(
      { chatId, sender: { $ne: userId }, "readBy.userId": { $ne: userId } },
      { $push: { readBy: { userId, readAt: new Date() } }, $set: { read: true } }
    );

    await Participant.findOneAndUpdate(
      { chatId, userId, isDeleted: false },
      {
        unreadCount: 0,
        lastReadMessageId: lastMessage?._id || null,
        lastReadAt: new Date(),
      }
    );

    await Chat.findByIdAndUpdate(chatId, { unreadMessageCount: 0 });
  }

  async pinMessage(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }

    const chat = await Chat.findById(message.chatId).lean();
    if (!chat || !chat.members.some((m) => String(m) === String(userId))) {
      const err = new Error("Not a member of this chat");
      err.statusCode = 403;
      throw err;
    }

    message.pinned = !message.pinned;
    message.pinnedBy = message.pinned ? userId : null;
    message.pinnedAt = message.pinned ? new Date() : null;
    await message.save();

    const inc = message.pinned ? 1 : -1;
    await Chat.findByIdAndUpdate(message.chatId, { $inc: { pinnedMessageCount: inc } });

    return Message.findById(message._id).populate("sender", "firstname lastname profilepic");
  }

  async getPinnedMessages(chatId, userId, { page = 1, limit = 20 } = {}) {
    const chat = await Chat.findById(chatId).lean();
    if (!chat || !chat.members.some((m) => String(m) === String(userId))) {
      const err = new Error("Not a member of this chat");
      err.statusCode = 403;
      throw err;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [messages, total] = await Promise.all([
      Message.find({ chatId, pinned: true })
        .sort({ pinnedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("sender", "firstname lastname profilepic")
        .lean(),
      Message.countDocuments({ chatId, pinned: true }),
    ]);

    return { messages, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async forwardMessage(messageId, targetChatId, userId) {
    const original = await Message.findById(messageId).lean();
    if (!original) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }

    const targetChat = await Chat.findById(targetChatId).lean();
    if (!targetChat || !targetChat.members.some((m) => String(m) === String(userId))) {
      const err = new Error("Not a member of target chat");
      err.statusCode = 403;
      throw err;
    }

    const forwardedMessage = new Message({
      chatId: targetChatId,
      sender: userId,
      tenantId: original.tenantId,
      text: original.text,
      audioUrl: original.audioUrl,
      audioDuration: original.audioDuration,
      imageUrl: original.imageUrl,
      fileUrl: original.fileUrl,
      fileName: original.fileName,
      fileSize: original.fileSize,
      mimeType: original.mimeType,
      linkPreview: original.linkPreview,
      messageType: original.messageType || "text",
      forwardedFrom: {
        messageId: original._id,
        chatId: original.chatId,
        senderId: original.sender,
      },
    });

    await forwardedMessage.save();
    await Chat.findByIdAndUpdate(targetChatId, { lastMessage: forwardedMessage._id, $inc: { unreadMessageCount: 1 } });

    await Participant.updateMany(
      { chatId: targetChatId, isDeleted: false, muted: false, userId: { $ne: userId } },
      { $inc: { unreadCount: 1 } }
    );

    return Message.findById(forwardedMessage._id).populate("sender", "firstname lastname profilepic");
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
      const err = "Cannot edit a deleted message";
      const error = new Error(err);
      error.statusCode = 400;
      throw error;
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

  async updateChat(chatId, userId, { name, description, icon }) {
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

    if (name !== undefined) chat.name = name;
    if (description !== undefined) chat.description = description;
    if (icon !== undefined) chat.icon = icon;
    await chat.save();

    return chat;
  }

  async archiveChat(chatId, userId) {
    const participant = await Participant.findOne({ chatId, userId, isDeleted: false });
    if (!participant) {
      const err = new Error("Not a participant of this chat");
      err.statusCode = 403;
      throw err;
    }

    participant.archived = true;
    await participant.save();

    return participant;
  }

  async unarchiveChat(chatId, userId) {
    const participant = await Participant.findOne({ chatId, userId, isDeleted: false });
    if (!participant) {
      const err = new Error("Not a participant of this chat");
      err.statusCode = 403;
      throw err;
    }

    participant.archived = false;
    await participant.save();

    return participant;
  }

  async deleteChat(chatId, userId) {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      const err = new Error("Chat not found");
      err.statusCode = 404;
      throw err;
    }

    const isAdmin = await Participant.findOne({ chatId, userId, role: "admin", isDeleted: false });
    if (!isAdmin && chat.type === "group") {
      const err = new Error("Only admins can delete group chats");
      err.statusCode = 403;
      throw err;
    }

    await Message.deleteMany({ chatId });
    await Participant.deleteMany({ chatId });
    await Chat.findByIdAndDelete(chatId);

    logger.info(`[Chat] Deleted: ${chatId}`);
    return { deleted: true };
  }

  async deleteUserChats(userId) {
    const chats = await Chat.find({ members: userId });
    const chatIds = chats.map((c) => c._id);
    await Message.deleteMany({ chatId: { $in: chatIds } });
    await Participant.deleteMany({ chatId: { $in: chatIds } });
    await Chat.deleteMany({ members: userId });
    logger.info(`[Chat] Deleted ${chats.length} chats and associated messages for user ${userId}`);
    return { deletedChats: chats.length };
  }
}

export default new ChatService();
