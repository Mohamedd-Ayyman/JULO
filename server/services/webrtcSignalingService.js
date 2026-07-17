import CallSession from "../models/callSession.js";
import logger from "../utils/logger.js";

class WebRtcSignalingService {
  constructor() {
    this._qualityMetrics = new Map();
  }

  // ── SDP Relay ───────────────────────────────────────────────────────────

  async handleOffer(callId, senderId, targetUserId, offer) {
    await this._validateParticipant(callId, senderId);
    return { callId, senderId, offer };
  }

  async handleAnswer(callId, senderId, targetUserId, answer) {
    await this._validateParticipant(callId, senderId);
    return { callId, senderId, answer };
  }

  async handleRenegotiate(callId, senderId, targetUserId, offer) {
    await this._validateParticipant(callId, senderId);
    return { callId, senderId, offer };
  }

  // ── ICE Candidate Relay ─────────────────────────────────────────────────

  async handleIceCandidate(callId, senderId, targetUserId, candidate) {
    await this._validateParticipant(callId, senderId);
    return { callId, senderId, candidate };
  }

  // ── Media State (mute/video/screen) ─────────────────────────────────────

  async handleMuteToggle(callId, userId, isMuted) {
    const call = await this._getActiveCall(callId);
    this._assertParticipant(call, userId);
    return {
      callId: call._id,
      userId,
      isMuted: !!isMuted,
      timestamp: new Date().toISOString(),
    };
  }

  async handleVideoToggle(callId, userId, isVideoOff) {
    const call = await this._getActiveCall(callId);
    this._assertParticipant(call, userId);
    return {
      callId: call._id,
      userId,
      isVideoOff: !!isVideoOff,
      timestamp: new Date().toISOString(),
    };
  }

  async handleScreenShareToggle(callId, userId, isScreenSharing) {
    const call = await this._getActiveCall(callId);
    this._assertParticipant(call, userId);
    return {
      callId: call._id,
      userId,
      isScreenSharing: !!isScreenSharing,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Session Lifecycle ───────────────────────────────────────────────────

  async handleJoinSession(callId, userId) {
    const call = await this._getActiveCall(callId);
    this._assertParticipant(call, userId);

    const participant = call.participants.find(
      (p) => String(p.userId) === String(userId)
    );
    if (participant && !participant.joinedAt) {
      participant.joinedAt = new Date();
      await call.save();
    }

    return {
      callId: call._id,
      userId,
      participants: call.participants.map((p) => ({
        userId: p.userId,
        joinedAt: p.joinedAt,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  async handleLeaveSession(callId, userId) {
    const call = await this._getActiveCall(callId);
    this._assertParticipant(call, userId);

    const participant = call.participants.find(
      (p) => String(p.userId) === String(userId)
    );
    if (participant && !participant.leftAt) {
      participant.leftAt = new Date();
      await call.save();
    }

    const remaining = call.participants.filter(
      (p) => !p.leftAt && String(p.userId) !== String(userId)
    );

    return {
      callId: call._id,
      userId,
      remainingParticipants: remaining.map((p) => ({ userId: p.userId })),
      timestamp: new Date().toISOString(),
    };
  }

  // ── Quality Metrics ─────────────────────────────────────────────────────

  handleQualityReport(callId, userId, metrics) {
    if (!metrics || typeof metrics !== "object") return;

    const key = `${callId}:${userId}`;
    this._qualityMetrics.set(key, {
      callId,
      userId,
      ...metrics,
      reportedAt: new Date().toISOString(),
    });

    // Evict stale entries (keep last 500 reports)
    if (this._qualityMetrics.size > 500) {
      const oldest = this._qualityMetrics.keys().next().value;
      this._qualityMetrics.delete(oldest);
    }
  }

  // ── Internal Helpers ────────────────────────────────────────────────────

  async _getActiveCall(callId) {
    const call = await CallSession.findById(callId);
    if (!call) throw new Error("Call not found");
    if (call.status !== "active") throw new Error("Call is not active");
    return call;
  }

  async _validateParticipant(callId, userId) {
    const call = await this._getActiveCall(callId);
    this._assertParticipant(call, userId);
    return call;
  }

  _assertParticipant(call, userId) {
    const participant = call.participants.find(
      (p) => String(p.userId) === String(userId)
    );
    if (!participant || participant.leftAt) {
      throw new Error("Not an active participant in this call");
    }
  }
}

export default new WebRtcSignalingService();
