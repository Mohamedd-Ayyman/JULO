import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Trash2, Eye, Pause, Play, Volume2, VolumeX } from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../Avatar.jsx";
import StoryViewersSheet from "./StoryViewersSheet.jsx";
import { markStoryViewed, deleteStory } from "../../apiCalls/users.js";

const IMAGE_DURATION = 5000;

export default function StoryViewer({ groups, startGroupIndex = 0, startStoryIndex = 0, currentUserId, onClose, onChanged }) {
  const [gIdx, setGIdx] = useState(startGroupIndex);
  const [sIdx, setSIdx] = useState(startStoryIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showViewers, setShowViewers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const rafRef = useRef(null);
  const startedAtRef = useRef(null);
  const elapsedRef = useRef(0);
  const videoRef = useRef(null);
  const portalRef = useRef(null);

  const group = groups[gIdx];
  const story = group?.stories?.[sIdx];
  const isOwner = story && currentUserId && String(group.user?._id) === String(currentUserId);
  const isMineGroup = group?.isMine || group?._id === "me";
  const isOverlayOpen = showViewers || showDeleteConfirm;

  const goNext = useCallback(() => {
    if (!group) return;
    if (sIdx < group.stories.length - 1) setSIdx((i) => i + 1);
    else if (gIdx < groups.length - 1) { setGIdx((i) => i + 1); setSIdx(0); }
    else onClose();
  }, [group, sIdx, gIdx, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (sIdx > 0) setSIdx((i) => i - 1);
    else if (gIdx > 0) {
      const prevGroup = groups[gIdx - 1];
      setGIdx((i) => i - 1);
      setSIdx(Math.max(0, (prevGroup?.stories?.length || 1) - 1));
    }
  }, [sIdx, gIdx, groups]);

  useEffect(() => {
    if (story?._id && !isOwner) markStoryViewed(story._id).catch(() => {});
    setProgress(0); elapsedRef.current = 0; startedAtRef.current = null;
  }, [story?._id, isOwner]);

  useEffect(() => {
    if (!story) return;
    if (story.mediaType === "video") return;
    if (isOverlayOpen) return;
    const tick = (ts) => {
      if (paused) { startedAtRef.current = ts; rafRef.current = requestAnimationFrame(tick); return; }
      if (startedAtRef.current == null) startedAtRef.current = ts;
      const dt = ts - startedAtRef.current;
      startedAtRef.current = ts;
      elapsedRef.current += dt;
      const p = Math.min(1, elapsedRef.current / IMAGE_DURATION);
      setProgress(p);
      if (p >= 1) { goNext(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [story, paused, goNext, isOverlayOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goNext, goPrev]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const existing = document.getElementById("story-viewer-portal");
    if (existing) { portalRef.current = existing; return; }
    const node = document.createElement("div");
    node.setAttribute("id", "story-viewer-portal");
    document.body.appendChild(node);
    portalRef.current = node;
    return () => { if (node.parentNode) node.parentNode.removeChild(node); };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused || isOverlayOpen) v.pause();
    else v.play().catch(() => {});
  }, [paused, isOverlayOpen, story?._id]);

  if (!story) return null;
  if (!portalRef.current) return null;

  const u = group.user || {};
  const name = `${u.firstname || ""} ${u.lastname || ""}`.trim() || "User";
  const isVideo = story.mediaType === "video";
  const viewCount = story.viewCount ?? story.views?.length ?? story.viewers?.length ?? 0;

  const handleDelete = async () => {
    const res = await deleteStory(story._id);
    if (!res.success) { toast.error("Couldn't delete"); return; }
    toast.success("Story deleted");
    setShowDeleteConfirm(false);
    if (group.stories.length === 1) { onChanged?.(); onClose(); }
    else { group.stories.splice(sIdx, 1); setSIdx((i) => Math.max(0, Math.min(i, group.stories.length - 1))); onChanged?.(); }
  };

  const timeAgo = (() => {
    if (!story.createdAt) return "";
    const diff = Date.now() - new Date(story.createdAt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h`;
  })();

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center animate-fade-in"
      style={{ background: "var(--ink)" }}
    >
      <button onClick={onClose}
        className="absolute top-4 right-4 z-30 w-10 h-10 grid place-items-center rounded-full"
        style={{ background: "rgba(243,236,217,0.15)" }} aria-label="Close">
        <X className="w-5 h-5 text-white" />
      </button>

      {(gIdx > 0 || sIdx > 0) && (
        <button onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="hidden sm:grid absolute left-4 z-30 w-12 h-12 place-items-center rounded-full"
          style={{ background: "rgba(243,236,217,0.15)" }} aria-label="Previous">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}
      <button onClick={(e) => { e.stopPropagation(); goNext(); }}
        className="hidden sm:grid absolute right-4 z-30 w-12 h-12 place-items-center rounded-full"
        style={{ background: "rgba(243,236,217,0.15)" }} aria-label="Next">
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      <div className="relative w-full max-w-[420px] aspect-[9/16] max-h-[95vh] overflow-hidden select-none"
        style={{ background: "var(--ink)", borderRadius: "var(--r-lg)" }}
        onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)} onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>

        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(243,236,217,0.3)" }}>
              <div className="h-full bg-white" style={{
                width: i < sIdx ? "100%" : i === sIdx ? `${progress * 100}%` : "0%",
                transition: i === sIdx ? "width 75ms linear" : "none",
              }} />
            </div>
          ))}
        </div>

        <div className="absolute top-5 left-0 right-0 z-20 flex items-center gap-2 px-3 pt-3">
          <Avatar src={u.profilepic} name={name} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{name}</p>
            <p className="text-[10px]" style={{ color: "rgba(243,236,217,0.7)" }}>{timeAgo}</p>
          </div>
          {isVideo && (
            <button onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
              className="w-9 h-9 grid place-items-center rounded-full"
              style={{ background: "rgba(243,236,217,0.15)" }} aria-label={muted ? "Unmute" : "Mute"}>
              {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setPaused((p) => !p); }}
            className="w-9 h-9 grid place-items-center rounded-full"
            style={{ background: "rgba(243,236,217,0.15)" }} aria-label={paused ? "Play" : "Pause"}>
            {paused ? <Play className="w-4 h-4 text-white" /> : <Pause className="w-4 h-4 text-white" />}
          </button>
          {isOwner && (
            <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
              className="w-9 h-9 grid place-items-center rounded-full"
              style={{ background: "rgba(243,236,217,0.15)" }} aria-label="Delete story">
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        <button onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10" aria-label="Previous" />
        <button onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10" aria-label="Next" />

        {isVideo ? (
          <video ref={videoRef} key={story._id} src={story.mediaUrl} className="w-full h-full object-contain"
            style={{ background: "var(--ink)" }} autoPlay playsInline muted={muted}
            onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
            onEnded={goNext} />
        ) : (
          <img src={story.mediaUrl} alt="" className="w-full h-full object-contain" style={{ background: "var(--ink)" }} draggable={false} />
        )}

        {story.caption && (
          <div className="absolute bottom-16 left-3 right-3 z-20 text-center">
            <p className="inline-block px-3 py-1.5 text-white text-sm font-medium rounded-lg" style={{ background: "rgba(0,0,0,0.5)" }}>{story.caption}</p>
          </div>
        )}

        {(isOwner || isMineGroup) && (
          <button onClick={(e) => { e.stopPropagation(); setShowViewers(true); }}
            className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            style={{ background: "rgba(0,0,0,0.55)" }}>
            <Eye className="w-4 h-4" />
            {viewCount} {viewCount === 1 ? "view" : "views"}
          </button>
        )}
      </div>

      {showViewers && <StoryViewersSheet storyId={story._id} onClose={() => setShowViewers(false)} />}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] grid place-items-center animate-fade-in"
          style={{ background: "rgba(20,17,15,0.6)" }}
          onClick={() => setShowDeleteConfirm(false)}>
          <div className="brutal-card w-full max-w-sm p-5 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1">
              <h3 className="text-base font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>Delete story</h3>
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>This story will be removed immediately. You can't undo this action.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="brutal-btn brutal-btn-outline flex-1">Cancel</button>
              <button onClick={handleDelete} className="brutal-btn flex-1" style={{ background: "var(--riso-red)", color: "var(--paper)", border: "2px solid var(--ink)", boxShadow: "3px 3px 0 0 var(--ink)" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    portalRef.current
  );
}