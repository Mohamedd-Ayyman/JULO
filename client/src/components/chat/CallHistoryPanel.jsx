import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ArrowLeft,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Phone,
  Loader2,
} from "lucide-react";
import Avatar from "../Avatar.jsx";
import CallHistoryItem from "./CallHistoryItem.jsx";
import CallHistorySkeleton from "./CallHistorySkeleton.jsx";
import { getCallHistory } from "../../apiCalls/message.js";

const MOCK_CALLS = [
  { _id: "mc1", caller: { _id: "u1", firstname: "Jane", lastname: "Doe", profilepic: "" }, callee: { _id: "me", firstname: "You", lastname: "", profilepic: "" }, type: "outgoing", status: "answered", duration: 342, hasRecording: false, startedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), endedAt: new Date(Date.now() - 1000 * 60 * 15 + 342000).toISOString() },
  { _id: "mc2", caller: { _id: "u2", firstname: "Alex", lastname: "Rivera", profilepic: "" }, callee: { _id: "me", firstname: "You", lastname: "", profilepic: "" }, type: "incoming", status: "missed", duration: 0, hasRecording: false, startedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), endedAt: null },
  { _id: "mc3", caller: { _id: "me", firstname: "You", lastname: "", profilepic: "" }, callee: { _id: "u1", firstname: "Jane", lastname: "Doe", profilepic: "" }, type: "outgoing", status: "answered", duration: 122, hasRecording: true, recordingUrl: "#", startedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), endedAt: new Date(Date.now() - 1000 * 60 * 60 * 26 + 122000).toISOString() },
  { _id: "mc4", caller: { _id: "u3", firstname: "Sam", lastname: "Chen", profilepic: "" }, callee: { _id: "me", firstname: "You", lastname: "", profilepic: "" }, type: "incoming", status: "answered", duration: 845, hasRecording: false, startedAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(), endedAt: new Date(Date.now() - 1000 * 60 * 60 * 50 + 845000).toISOString() },
  { _id: "mc5", caller: { _id: "u4", firstname: "Morgan", lastname: "Lee", profilepic: "" }, callee: { _id: "me", firstname: "You", lastname: "", profilepic: "" }, type: "incoming", status: "missed", duration: 0, hasRecording: false, startedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), endedAt: null },
  { _id: "mc6", caller: { _id: "me", firstname: "You", lastname: "", profilepic: "" }, callee: { _id: "u3", firstname: "Sam", lastname: "Chen", profilepic: "" }, type: "outgoing", status: "answered", duration: 67, hasRecording: true, recordingUrl: "#", startedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), endedAt: new Date(Date.now() - 1000 * 60 * 60 * 96 + 67000).toISOString() },
  { _id: "mc7", caller: { _id: "u1", firstname: "Jane", lastname: "Doe", profilepic: "" }, callee: { _id: "me", firstname: "You", lastname: "", profilepic: "" }, type: "incoming", status: "declined", duration: 0, hasRecording: false, startedAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), endedAt: null },
  { _id: "mc8", caller: { _id: "me", firstname: "You", lastname: "", profilepic: "" }, callee: { _id: "u2", firstname: "Alex", lastname: "Rivera", profilepic: "" }, type: "outgoing", status: "no_answer", duration: 0, hasRecording: false, startedAt: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString(), endedAt: null },
];

const MOCK_MODE = false;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "missed", label: "Missed" },
  { id: "incoming", label: "Incoming" },
  { id: "outgoing", label: "Outgoing" },
  { id: "recorded", label: "Recorded" },
];

export default function CallHistoryPanel({ chatId, currentUserId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchCalls = useCallback(async (pageNum, filter) => {
    if (MOCK_MODE) {
      let filtered = [...MOCK_CALLS];
      if (filter === "missed") filtered = filtered.filter((c) => c.status === "missed" || c.status === "declined" || c.status === "no_answer");
      else if (filter === "incoming") filtered = filtered.filter((c) => (c.type === "incoming" || c.caller?._id !== currentUserId) && c.status !== "missed");
      else if (filter === "outgoing") filtered = filtered.filter((c) => c.type === "outgoing" && c.caller?._id === currentUserId);
      else if (filter === "recorded") filtered = filtered.filter((c) => c.hasRecording);
      return { data: filtered, page: 1, pages: 1 };
    }
    try {
      const res = await getCallHistory(chatId, { page: pageNum, limit: 30, type: filter });
      return res.success ? { data: res.data || [], page: res.page || 1, pages: res.pages || 1 } : { data: [], page: 1, pages: 0 };
    } catch {
      return { data: [], page: 1, pages: 0 };
    }
  }, [chatId, currentUserId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(1);
    setHasMore(true);
    (async () => {
      const result = await fetchCalls(1, activeFilter);
      if (cancelled) return;
      setCalls(result.data);
      setHasMore(result.page < result.pages);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeFilter, fetchCalls]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const result = await fetchCalls(nextPage, activeFilter);
    setCalls((prev) => [...prev, ...result.data]);
    setPage(nextPage);
    setHasMore(result.page < result.pages);
    setLoadingMore(false);
  }, [page, activeFilter, hasMore, loadingMore, fetchCalls]);

  const filteredCalls = MOCK_MODE
    ? calls
    : calls;

  return (
    <div className="fixed inset-0 z-[60] flex anim-fade-in" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-lg mx-auto my-0 md:my-4 max-h-screen md:max-h-[90vh] flex flex-col anim-scale-in overflow-hidden"
        style={{ background: "var(--paper)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-4)" }}
      >
        <div className="flex items-center justify-between p-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--line-soft)" }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="brutal-btn brutal-btn-ghost brutal-btn-icon" style={{ width: 32, height: 32 }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="font-display text-lg font-black tracking-tight" style={{ color: "var(--ink)" }}>Call History</h2>
          </div>
          <button onClick={onClose} className="brutal-btn brutal-btn-ghost brutal-btn-icon" style={{ width: 32, height: 32 }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pt-3 pb-1 flex-shrink-0">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className="flex-shrink-0 font-mono text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 transition-all flex items-center gap-1.5"
                style={{
                  background: isActive ? "var(--ink)" : "transparent",
                  color: isActive ? "var(--paper)" : "var(--muted)",
                  border: "1px solid " + (isActive ? "var(--ink)" : "var(--line)"),
                  borderRadius: "var(--r-pill)",
                }}
              >
                {f.id === "missed" && <PhoneMissed className="w-3 h-3" />}
                {f.label}
                {f.id === "missed" && !MOCK_MODE && (
                  <span
                    className="font-mono text-[9px] font-bold px-1 min-w-[16px] text-center"
                    style={{
                      background: isActive ? "var(--paper)" : "var(--riso-red)",
                      color: isActive ? "var(--ink)" : "var(--paper)",
                      borderRadius: "var(--r-pill)",
                    }}
                  >
                    {calls.filter((c) => c.status === "missed" || c.status === "declined" || c.status === "no_answer").length || 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loading ? (
            <div className="p-2"><CallHistorySkeleton /></div>
          ) : filteredCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div
                className="w-16 h-16 mb-4 grid place-items-center"
                style={{ background: "var(--paper-3)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-sm)" }}
              >
                <Phone className="w-7 h-7" style={{ color: "var(--muted)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                {activeFilter === "all" ? "No calls yet" : `No ${activeFilter} calls`}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-2)" }}>
                {activeFilter === "all"
                  ? "Start a call to see your history here."
                  : `No ${activeFilter} calls found.`}
              </p>
            </div>
          ) : (
            <>
              <div className="px-2 py-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>
                  {filteredCalls.length} call{filteredCalls.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-0.5">
                {filteredCalls.map((call) => (
                  <CallHistoryItem
                    key={call._id}
                    call={call}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
              {hasMore && !MOCK_MODE && (
                <div className="flex justify-center py-3">
                  {loadingMore ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--muted)" }} />
                  ) : (
                    <button
                      onClick={loadMore}
                      className="font-mono text-[10px] uppercase tracking-widest font-bold px-4 py-2 transition-all"
                      style={{ color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--r-pill)" }}
                    >
                      Load more
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
