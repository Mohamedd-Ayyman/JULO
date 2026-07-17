import mongoose from "mongoose";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import Participant from "../models/participant.js";
import User from "../models/user.js";
import Media from "../models/media.js";
import { scopeByTenant } from "../middlewares/tenantMiddleware.js";
import logger from "../utils/logger.js";

export function sanitizeText(text) {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function parseMentions(text, chatMembers) {
  if (!text || !chatMembers || chatMembers.length === 0) return [];

  const mentionPattern = /@(\w+(?:\s+\w+)*)/gi;
  const mentionedIds = new Set();
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    const query = match[1].toLowerCase().trim();
    for (const member of chatMembers) {
      const memberId = String(member._id || member);
      const firstName = (member.firstname || "").toLowerCase();
      const lastName = (member.lastname || "").toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();

      if (query === firstName || query === fullName) {
        mentionedIds.add(memberId);
      }
    }
  }

  return [...mentionedIds];
}

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

  async getAllForUser(userId, tenantId, { page = 1, limit = 20, type, archived = false, search } = {}) {
    const participantQuery = { userId, isDeleted: false, archived };

    const chatMatch = {};
    if (tenantId) chatMatch.tenantId = tenantId;
    if (type) chatMatch.type = type;
    if (search) {
      chatMatch.$or = [
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [participants, total] = await Promise.all([
      Participant.find(participantQuery)
        .populate({
          path: "chatId",
          match: Object.keys(chatMatch).length ? chatMatch : undefined,
          populate: [
            { path: "lastMessage", select: "text sender createdAt messageType" },
            { path: "createdBy", select: "firstname lastname" },
          ],
        })
        .sort({ pinned: -1, updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Participant.countDocuments(participantQuery),
    ]);

    const validParticipants = participants.filter((p) => p.chatId);

    const directChatPartnerIds = [];
    for (const p of validParticipants) {
      const chat = p.chatId;
      if (chat.type === "direct" && Array.isArray(chat.members)) {
        const partnerId = chat.members.find((m) => String(m) !== String(userId));
        if (partnerId) directChatPartnerIds.push(partnerId);
      }
    }

    let partnerMap = {};
    if (directChatPartnerIds.length > 0) {
      const User = (await import("../models/user.js")).default;
      const partners = await User.find({ _id: { $in: directChatPartnerIds } })
        .select("firstname lastname profilepic isOnline lastSeen")
        .lean();
      for (const u of partners) {
        partnerMap[String(u._id)] = u;
      }
    }

    if (search) {
      const searchLower = search.toLowerCase();
      const matchedPartnerIds = new Set(
        Object.entries(partnerMap)
          .filter(([, u]) => {
            const fullName = `${u.firstname} ${u.lastname}`.toLowerCase();
            return fullName.includes(searchLower);
          })
          .map(([id]) => id)
      );

      const filtered = validParticipants.filter((p) => {
        const chat = p.chatId;
        if (chat.name && chat.name.toLowerCase().includes(searchLower)) return true;
        if (chat.type === "direct" && Array.isArray(chat.members)) {
          const partnerId = chat.members.find((m) => String(m) !== String(userId));
          if (partnerId && matchedPartnerIds.has(String(partnerId))) return true;
        }
        return false;
      });

      return this._buildConversationResponse(filtered, partnerMap, userId, {
        total: filtered.length,
        page: Number(page),
        pages: Math.ceil(filtered.length / Number(limit)),
        userId,
      });
    }

    return this._buildConversationResponse(validParticipants, partnerMap, userId, {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      userId,
    });
  }

  async _buildConversationResponse(validParticipants, partnerMap, currentUserId, pagination) {
    let totalUnread = 0;

    const unreadParticipants = await Participant.find({
      userId: currentUserId,
      isDeleted: false,
      archived: false,
    })
      .select("unreadCount")
      .lean();
    for (const p of unreadParticipants) {
      totalUnread += p.unreadCount || 0;
    }

    const conversations = validParticipants.map((p) => {
      const chat = p.chatId;
      const base = {
        _id: chat._id,
        type: chat.type,
        name: chat.name,
        description: chat.description,
        icon: chat.icon,
        isEncrypted: chat.isEncrypted,
        lastMessage: chat.lastMessage || null,
        members: chat.members,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
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
      };

      if (chat.type === "direct" && Array.isArray(chat.members)) {
        const partnerId = chat.members.find((m) => String(m) !== String(currentUserId));
        if (partnerId && partnerMap[String(partnerId)]) {
          const partner = partnerMap[String(partnerId)];
          base.otherUser = {
            _id: partner._id,
            firstname: partner.firstname,
            lastname: partner.lastname,
            profilepic: partner.profilepic,
            isOnline: partner.isOnline,
            lastSeen: partner.lastSeen,
          };
        }
      } else {
        base.memberCount = chat.members ? chat.members.length : 0;
      }

      return base;
    });

    return {
      conversations,
      total: pagination.total,
      page: pagination.page,
      pages: pagination.pages,
      totalUnread,
    };
  }

  async getMessages(chatId, userId, { cursor = null, limit = 50, direction = "backward", includeDeleted = false, messageType, search } = {}) {
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

    if (!direction) direction = "backward";
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const query = { chatId };

    if (cursor) {
      if (direction === "forward") {
        query._id = { $gt: new mongoose.Types.ObjectId(cursor) };
      } else {
        query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
      }
    }

    if (!includeDeleted) {
      query.deleted = { $ne: true };
    }
    if (messageType) {
      query.messageType = messageType;
    }
    if (search) {
      query.$text = { $search: search };
    }

    const sort = direction === "forward" ? { _id: 1 } : { _id: -1 };

    const messages = await Message.find(query)
      .sort(sort)
      .limit(safeLimit + 1)
      .populate("sender", "firstname lastname profilepic")
      .populate("replyTo", "text sender createdAt")
      .populate("threadRootId", "text sender createdAt")
      .populate("mentions", "firstname lastname profilepic")
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

    const messageData = { chatId, sender: senderId, tenantId, text: sanitizeText(text), read: false, status: "sent" };

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
      messageData.fileName = sanitizeText(fileName || null);
      messageData.fileSize = fileSize || null;
      messageData.mimeType = mimeType || null;
      messageData.messageType = "file";
    }

    if (linkPreview) {
      messageData.linkPreview = {
        title: sanitizeText(linkPreview.title || ""),
        description: sanitizeText(linkPreview.description || ""),
        image: linkPreview.image || "",
        url: linkPreview.url || "",
        siteName: sanitizeText(linkPreview.siteName || ""),
      };
    }

    if (messageData.text) {
      const memberDocs = await User.find({ _id: { $in: chat.members } })
        .select("firstname lastname")
        .lean();
      messageData.mentions = parseMentions(messageData.text, memberDocs);
    }

    const populateMentions = (q) => q.populate("mentions", "firstname lastname profilepic");

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
      return populateMentions(
        Message.findById(message._id)
          .populate("sender", "firstname lastname profilepic")
          .populate("replyTo", "text sender createdAt")
      );
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
      return populateMentions(
        Message.findById(message._id)
          .populate("sender", "firstname lastname profilepic")
          .populate("replyTo", "text sender createdAt")
      );
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
      { $push: { readBy: { userId, readAt: new Date() } }, $set: { read: true, status: "read" } }
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

  async markDelivered(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }
    if (String(message.sender) === String(userId)) {
      return message;
    }

    const alreadyDelivered = message.deliveredTo?.some(
      (d) => String(d.userId) === String(userId)
    );
    if (alreadyDelivered) return message;

    const update = {
      $push: { deliveredTo: { userId, readAt: new Date() } },
    };

    if (message.status === "sent") {
      update.$set = { status: "delivered" };
    }

    await Message.findByIdAndUpdate(messageId, update);

    return Message.findById(messageId)
      .populate("sender", "firstname lastname profilepic");
  }

  async getMessageReceipts(messageId, userId) {
    const message = await Message.findById(messageId).lean();
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

    const User = (await import("../models/user.js")).default;

    const deliveredUserIds = (message.deliveredTo || []).map((d) => d.userId);
    const readUserIds = (message.readBy || []).map((r) => r.userId);
    const allUserIds = [...new Set([...deliveredUserIds.map(String), ...readUserIds.map(String)])];

    let userMap = {};
    if (allUserIds.length > 0) {
      const users = await User.find({ _id: { $in: allUserIds } })
        .select("firstname lastname profilepic")
        .lean();
      for (const u of users) {
        userMap[String(u._id)] = u;
      }
    }

    const deliveredTo = (message.deliveredTo || []).map((d) => ({
      userId: d.userId,
      deliveredAt: d.readAt,
      user: userMap[String(d.userId)] || null,
    }));

    const readBy = (message.readBy || []).map((r) => ({
      userId: r.userId,
      readAt: r.readAt,
      user: userMap[String(r.userId)] || null,
    }));

    return {
      messageId: message._id,
      chatId: message.chatId,
      sender: message.sender,
      status: message.status,
      deliveredTo,
      readBy,
    };
  }

  async getBulkReceipts(chatId, messageIds, userId) {
    const chat = await Chat.findById(chatId).lean();
    if (!chat || !chat.members.some((m) => String(m) === String(userId))) {
      const err = new Error("Not a member of this chat");
      err.statusCode = 403;
      throw err;
    }

    const messages = await Message.find({
      _id: { $in: messageIds },
      chatId,
    })
      .select("sender status deliveredTo readBy")
      .lean();

    const User = (await import("../models/user.js")).default;

    const allUserIds = new Set();
    for (const msg of messages) {
      (msg.deliveredTo || []).forEach((d) => allUserIds.add(String(d.userId)));
      (msg.readBy || []).forEach((r) => allUserIds.add(String(r.userId)));
    }

    let userMap = {};
    if (allUserIds.size > 0) {
      const users = await User.find({ _id: { $in: [...allUserIds] } })
        .select("firstname lastname profilepic")
        .lean();
      for (const u of users) {
        userMap[String(u._id)] = u;
      }
    }

    return messages.map((msg) => ({
      messageId: msg._id,
      sender: msg.sender,
      status: msg.status,
      deliveredTo: (msg.deliveredTo || []).map((d) => ({
        userId: d.userId,
        deliveredAt: d.readAt,
        user: userMap[String(d.userId)] || null,
      })),
      readBy: (msg.readBy || []).map((r) => ({
        userId: r.userId,
        readAt: r.readAt,
        user: userMap[String(r.userId)] || null,
      })),
    }));
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
    const sanitized = sanitizeText(text);
    if (!sanitized) {
      const err = new Error("Text is required");
      err.statusCode = 400;
      throw err;
    }
    if (!Array.isArray(message.editHistory)) {
      message.editHistory = [];
    }
    if (message.text && message.text !== "[deleted]") {
      message.editHistory.push({
        text: message.text,
        editedAt: new Date(),
        editedBy: userId,
      });
    }
    message.text = sanitized;
    message.edited = true;
    message.editCount = message.editHistory.length;

    const chat = await Chat.findById(message.chatId).lean();
    if (chat) {
      const memberDocs = await User.find({ _id: { $in: chat.members } })
        .select("firstname lastname")
        .lean();
      message.mentions = parseMentions(sanitized, memberDocs);
    }

    await message.save();
    return Message.findById(message._id)
      .populate("sender", "firstname lastname profilepic")
      .populate("mentions", "firstname lastname profilepic");
  }

  async restoreMessage(messageId, userId) {
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
    if (!message.deleted) {
      const err = new Error("Message is not deleted");
      err.statusCode = 400;
      throw err;
    }
    message.deleted = false;
    message.text = message.editHistory && message.editHistory.length > 0
      ? message.editHistory[message.editHistory.length - 1].text
      : "[restored]";
    await message.save();
    return Message.findById(message._id).populate("sender", "firstname lastname profilepic");
  }

  async deleteMessage(messageId, userId, { isAdmin = false } = {}) {
    const message = await Message.findById(messageId);
    if (!message) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }
    if (String(message.sender) !== String(userId) && !isAdmin) {
      const err = new Error("You can only delete your own messages");
      err.statusCode = 403;
      throw err;
    }
    if (isAdmin && String(message.sender) !== String(userId)) {
      message.text = "[deleted by admin]";
    } else {
      message.text = "[deleted]";
    }
    message.deleted = true;
    message.edited = false;
    await message.save();

    try {
      await Media.updateMany({ messageId }, { deleted: true });
    } catch (_) {}

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
    let added;
    if (idx > -1) {
      reactions[emoji].splice(idx, 1);
      if (reactions[emoji].length === 0) delete reactions[emoji];
      added = false;
    } else {
      reactions[emoji].push(userId);
      added = true;
    }
    message.reactions = reactions;
    await message.save();
    const populated = await Message.findById(message._id).populate("sender", "firstname lastname profilepic");
    return { message: populated, added };
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
    await Media.deleteMany({ chatId });
    await Participant.deleteMany({ chatId });
    await Chat.findByIdAndDelete(chatId);

    logger.info(`[Chat] Deleted: ${chatId}`);
    return { deleted: true };
  }

  async deleteUserChats(userId) {
    const chats = await Chat.find({ members: userId });
    const chatIds = chats.map((c) => c._id);
    await Message.deleteMany({ chatId: { $in: chatIds } });
    await Media.deleteMany({ chatId: { $in: chatIds } });
    await Participant.deleteMany({ chatId: { $in: chatIds } });
    await Chat.deleteMany({ members: userId });
    logger.info(`[Chat] Deleted ${chats.length} chats and associated messages for user ${userId}`);
    return { deletedChats: chats.length };
  }

  async getChatMembersForMentions(chatId, userId, { q = "", limit = 10 } = {}) {
    const chat = await Chat.findById(chatId).lean();
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

    const query = { _id: { $in: chat.members } };
    if (q) {
      const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { firstname: { $regex: safeQ, $options: "i" } },
        { lastname: { $regex: safeQ, $options: "i" } },
      ];
    }

    const members = await User.find(query)
      .select("firstname lastname profilepic")
      .limit(Number(limit))
      .lean();

    return { members, total: members.length };
  }

  async getMentionedMessages(chatId, userId, { page = 1, limit = 20 } = {}) {
    const chat = await Chat.findById(chatId).lean();
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
      Message.find({ chatId, mentions: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("sender", "firstname lastname profilepic")
        .populate("mentions", "firstname lastname profilepic")
        .lean(),
      Message.countDocuments({ chatId, mentions: userId }),
    ]);

    return { messages, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }
}

export default new ChatService();
