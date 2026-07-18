import CallSession from "../models/callSession.js";
import Chat from "../models/chat.js";
import logger from "../utils/logger.js";

const MISSED_CALL_TIMEOUT_MS = 30_000;

export class CallSessionService {
  async initiateCall(chatId, initiatorId, tenantId, callType = "audio") {
    const chat = await Chat.findById(chatId).lean();
    if (!chat) {
      const err = new Error("Chat not found");
      err.statusCode = 404;
      throw err;
    }

    if (!chat.members.some((m) => String(m) === String(initiatorId))) {
      const err = new Error("Not a member of this chat");
      err.statusCode = 403;
      throw err;
    }

    const activeCall = await CallSession.findOne({
      chatId,
      status: { $in: ["ringing", "active"] },
    });

    if (activeCall) {
      const err = new Error("A call is already active in this chat");
      err.statusCode = 409;
      throw err;
    }

    const participants = chat.members.map((memberId) => ({
      userId: memberId,
      joinedAt: null,
      leftAt: null,
      consentToRecording: false,
      consentUpdatedAt: null,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
    }));

    const call = await CallSession.create({
      chatId,
      initiator: initiatorId,
      tenantId,
      participants,
      status: "ringing",
      callType,
    });

    logger.info(`[Call] Initiated: ${call._id} in chat ${chatId} by ${initiatorId}`);

    const callId = call._id;
    setTimeout(async () => {
      try {
        const current = await CallSession.findById(callId).lean();
        if (current && current.status === "ringing") {
          await this.markCallMissed(callId);

          const { getIO } = await import("../utils/socket.js");
          const io = getIO();
          io.to(`chat:${chatId}`).emit("call_missed", {
            callId,
            initiator: initiatorId,
            callType: callType || "audio",
          });

          logger.info(`[Call] Auto-marked as missed after timeout: ${callId}`);
        }
      } catch (err) {
        logger.error(`[Call] Missed-call timeout error for ${callId}: ${err.message}`);
      }
    }, MISSED_CALL_TIMEOUT_MS);

    return this._populateCall(callId);
  }

  async acceptCall(callId, userId) {
    const call = await CallSession.findById(callId);
    if (!call) {
      const err = new Error("Call not found");
      err.statusCode = 404;
      throw err;
    }

    if (call.status !== "ringing") {
      const err = new Error("Call is not in ringing state");
      err.statusCode = 400;
      throw err;
    }

    const participant = call.participants.find(
      (p) => String(p.userId) === String(userId)
    );
    if (!participant) {
      const err = new Error("You are not a participant of this call");
      err.statusCode = 403;
      throw err;
    }

    participant.joinedAt = new Date();
    call.status = "active";
    call.startedAt = new Date();
    await call.save();

    logger.info(`[Call] Accepted: ${callId} by ${userId}`);
    return this._populateCall(callId);
  }

  async rejectCall(callId, userId) {
    const call = await CallSession.findById(callId);
    if (!call) {
      const err = new Error("Call not found");
      err.statusCode = 404;
      throw err;
    }

    if (call.status !== "ringing") {
      const err = new Error("Call is not in ringing state");
      err.statusCode = 400;
      throw err;
    }

    const participant = call.participants.find(
      (p) => String(p.userId) === String(userId)
    );
    if (!participant) {
      const err = new Error("You are not a participant of this call");
      err.statusCode = 403;
      throw err;
    }

    call.status = "rejected";
    call.endedAt = new Date();
    call.endedBy = userId;
    call.endReason = "cancelled";
    await call.save();

    logger.info(`[Call] Rejected: ${callId} by ${userId}`);
    return this._populateCall(callId);
  }

  async endCall(callId, userId, reason = "normal") {
    const call = await CallSession.findById(callId);
    if (!call) {
      const err = new Error("Call not found");
      err.statusCode = 404;
      throw err;
    }

    if (call.status === "ended" || call.status === "missed" || call.status === "rejected") {
      const err = new Error("Call has already ended");
      err.statusCode = 400;
      throw err;
    }

    const participant = call.participants.find(
      (p) => String(p.userId) === String(userId)
    );
    if (!participant) {
      const err = new Error("You are not a participant of this call");
      err.statusCode = 403;
      throw err;
    }

    call.status = "ended";
    call.endedAt = new Date();
    call.endedBy = userId;
    call.endReason = reason;

    if (call.startedAt) {
      call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
    }

    for (const p of call.participants) {
      if (!p.leftAt && p.joinedAt) {
        p.leftAt = new Date();
      }
    }

    await call.save();

    logger.info(`[Call] Ended: ${callId} by ${userId} reason=${reason} duration=${call.duration}s`);
    return this._populateCall(callId);
  }

  async getActiveCall(chatId) {
    const call = await CallSession.findOne({
      chatId,
      status: { $in: ["ringing", "active"] },
    });

    if (!call) return null;
    return this._populateCall(call._id);
  }

  async getCallHistory(chatId, userId, { page = 1, limit = 20, type, callType, fromDate, toDate } = {}) {
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
    const query = this._buildCallHistoryQuery(chatId, userId, { type, callType, fromDate, toDate });

    const [calls, total] = await Promise.all([
      CallSession.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("initiator", "firstname lastname profilepic")
        .populate("participants.userId", "firstname lastname profilepic")
        .populate("recordingId", "fileUrl duration status")
        .lean(),
      CallSession.countDocuments(query),
    ]);

    return {
      calls: calls.map((c) => this._formatCallHistoryItem(c, userId)),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async getUserCallHistory(userId, tenantId, { page = 1, limit = 20, type, callType, fromDate, toDate } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const query = this._buildCallHistoryQuery(null, userId, { type, callType, fromDate, toDate });
    query["participants.userId"] = userId;
    if (tenantId) query.tenantId = tenantId;

    const [calls, total] = await Promise.all([
      CallSession.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("initiator", "firstname lastname profilepic")
        .populate("participants.userId", "firstname lastname profilepic")
        .populate("chatId", "members")
        .populate("recordingId", "fileUrl duration status")
        .lean(),
      CallSession.countDocuments(query),
    ]);

    return {
      calls: calls.map((c) => this._formatCallHistoryItem(c, userId)),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async getCallDetails(callId, userId) {
    const call = await CallSession.findById(callId)
      .populate("initiator", "firstname lastname profilepic")
      .populate("participants.userId", "firstname lastname profilepic")
      .populate("recordingId", "fileUrl duration status createdAt")
      .lean();

    if (!call) {
      const err = new Error("Call not found");
      err.statusCode = 404;
      throw err;
    }

    const isParticipant = call.participants.some(
      (p) => String(p.userId._id || p.userId) === String(userId)
    );
    if (!isParticipant) {
      const err = new Error("Access denied");
      err.statusCode = 403;
      throw err;
    }

    return call;
  }

  async grantRecordingConsent(callId, userId) {
    const call = await CallSession.findById(callId);
    if (!call) {
      const err = new Error("Call not found");
      err.statusCode = 404;
      throw err;
    }

    if (call.status === "ended" || call.status === "missed" || call.status === "rejected") {
      const err = new Error("Call has already ended");
      err.statusCode = 400;
      throw err;
    }

    const participant = call.participants.find(
      (p) => String(p.userId) === String(userId)
    );
    if (!participant) {
      const err = new Error("You are not a participant of this call");
      err.statusCode = 403;
      throw err;
    }

    participant.consentToRecording = true;
    participant.consentUpdatedAt = new Date();
    await call.save();

    logger.info(`[Call] Recording consent granted: ${callId} by ${userId}`);
    return this._populateCall(callId);
  }

  async revokeRecordingConsent(callId, userId) {
    const call = await CallSession.findById(callId);
    if (!call) {
      const err = new Error("Call not found");
      err.statusCode = 404;
      throw err;
    }

    if (call.isRecording) {
      const err = new Error("Cannot revoke consent while recording is in progress");
      err.statusCode = 400;
      throw err;
    }

    const participant = call.participants.find(
      (p) => String(p.userId) === String(userId)
    );
    if (!participant) {
      const err = new Error("You are not a participant of this call");
      err.statusCode = 403;
      throw err;
    }

    participant.consentToRecording = false;
    participant.consentUpdatedAt = new Date();
    await call.save();

    logger.info(`[Call] Recording consent revoked: ${callId} by ${userId}`);
    return this._populateCall(callId);
  }

  async canStartRecording(callId) {
    const call = await CallSession.findById(callId).lean();
    if (!call) {
      const err = new Error("Call not found");
      err.statusCode = 404;
      throw err;
    }

    if (call.status !== "active") {
      return { allowed: false, reason: "Call is not active" };
    }

    const allConsented = call.participants.every((p) => p.consentToRecording);
    if (!allConsented) {
      const pending = call.participants.filter((p) => !p.consentToRecording);
      return {
        allowed: false,
        reason: "Not all participants have consented to recording",
        pendingParticipants: pending.map((p) => p.userId),
      };
    }

    return { allowed: true };
  }

  async getRecordingConsentStatus(callId) {
    const call = await CallSession.findById(callId)
      .populate("participants.userId", "firstname lastname profilepic")
      .lean();

    if (!call) {
      const err = new Error("Call not found");
      err.statusCode = 404;
      throw err;
    }

    const allConsented = call.participants.every((p) => p.consentToRecording);

    return {
      callId,
      allConsented,
      participants: call.participants.map((p) => ({
        userId: p.userId._id || p.userId,
        firstname: p.userId.firstname,
        lastname: p.userId.lastname,
        consentToRecording: p.consentToRecording,
        consentUpdatedAt: p.consentUpdatedAt,
      })),
    };
  }

  async markCallMissed(callId) {
    const call = await CallSession.findById(callId);
    if (!call) return null;

    if (call.status === "ringing") {
      call.status = "missed";
      call.endedAt = new Date();
      call.endReason = "timeout";
      await call.save();
      logger.info(`[Call] Marked as missed: ${callId}`);
    }

    return call;
  }

  async updateRecordingId(callId, recordingId) {
    const call = await CallSession.findByIdAndUpdate(
      callId,
      { recordingId, isRecording: true, recordingStartedAt: new Date() },
      { new: true }
    );
    if (!call) {
      const err = new Error("Call not found");
      err.statusCode = 404;
      throw err;
    }
    return call;
  }

  async getMissedCallCount(userId, tenantId) {
    const query = {
      "participants.userId": userId,
      status: "missed",
    };
    if (tenantId) query.tenantId = tenantId;

    const count = await CallSession.countDocuments(query);
    return { count };
  }

  _formatCallHistoryItem(call, userId) {
    const initiatorId = String(call.initiator?._id || call.initiator);
    const isOutgoing = initiatorId === String(userId);

    const calleeParticipant = call.participants?.find(
      (p) => String(p.userId?._id || p.userId) !== initiatorId
    );
    const callee = calleeParticipant?.userId || null;

    let type;
    if (call.status === "missed") {
      type = "missed";
    } else {
      type = isOutgoing ? "outgoing" : "incoming";
    }

    const statusMap = {
      ended: "answered",
      missed: "missed",
      rejected: "declined",
    };
    const status = statusMap[call.status] || "no_answer";

    const hasRecording = !!(call.recordingId);
    const recordingUrl = call.recordingId?.fileUrl || null;

    return {
      _id: call._id,
      chatId: call.chatId,
      caller: call.initiator,
      callee,
      type,
      status,
      duration: call.duration || 0,
      hasRecording,
      recordingUrl,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
    };
  }

  _buildCallHistoryQuery(chatId, userId, { type, callType, fromDate, toDate } = {}) {
    const query = {};
    if (chatId) query.chatId = chatId;

    if (!type || type === "all") {
      query.status = { $in: ["ended", "missed", "rejected"] };
    } else {
      switch (type) {
        case "missed":
          query.status = "missed";
          break;
        case "incoming":
          query.status = { $in: ["ended", "missed", "rejected"] };
          query.initiator = { $ne: userId };
          break;
        case "outgoing":
          query.status = { $in: ["ended", "missed", "rejected"] };
          query.initiator = userId;
          break;
        case "recorded":
          query.status = { $in: ["ended", "missed", "rejected"] };
          query.recordingId = { $ne: null };
          break;
      }
    }

    if (callType) query.callType = callType;

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    return query;
  }

  async _populateCall(callId) {
    return CallSession.findById(callId)
      .populate("initiator", "firstname lastname profilepic")
      .populate("participants.userId", "firstname lastname profilepic")
      .populate("recordingId", "fileUrl duration status")
      .lean();
  }
}

export default new CallSessionService();
