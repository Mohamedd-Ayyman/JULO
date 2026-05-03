import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../Avatar.jsx";
import StoryViewersSheet from "./StoryViewersSheet.jsx";
import { markStoryViewed, deleteStory } from "../../apiCalls/users.js";

const IMAGE_DURATION = 5000;

export default function StoryViewer({
  groups,
  startGroupIndex = 0,
  startStoryIndex = 0,
  currentUserId,
  onClose,
  onChanged,
}) {
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
  const isOwner =
    story && currentUserId && String(group.user?._id) === String(currentUserId);
  const isMineGroup = group?.isMine || group?._id === "me";

  const goNext = useCallback(() => {
    if (!group) return;
    if (sIdx < group.stories.length - 1) {
      setSIdx((i) => i + 1);
    } else if (gIdx < groups.length - 1) {
      setGIdx((i) => i + 1);
      setSIdx(0);
    } else {
      onClose();
    }
  }, [group, sIdx, gIdx, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (sIdx > 0) {
      setSIdx((i) => i - 1);
    } else if (gIdx > 0) {
      const prevGroup = groups[gIdx - 1];
      setGIdx((i) => i - 1);
      setSIdx(Math.max(0, (prevGroup?.stories?.length || 1) - 1));
    }
  }, [sIdx, gIdx, groups]);

  // Mark viewed on story change
  useEffect(() => {
    if (story?._id && !isOwner) markStoryViewed(story._id).catch(() => {});
    setProgress(0);
    elapsedRef.current = 0;
    startedAtRef.current = null;
  }, [story?._id, isOwner]);

  const isOverlayOpen = showViewers || showDeleteConfirm;

  // Image progress driver
  useEffect(() => {
    if (!story) return;
    if (story.mediaType === "video") return;
    if (isOverlayOpen) return;

    const tick = (ts) => {
      if (paused) {
        startedAtRef.current = ts;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (startedAtRef.current == null) startedAtRef.current = ts;
      const dt = ts - startedAtRef.current;
      startedAtRef.current = ts;
      elapsedRef.current += dt;
      const p = Math.min(1, elapsedRef.current / IMAGE_DURATION);
      setProgress(p);
      if (p >= 1) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [story, paused, goNext, isOverlayOpen]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goNext, goPrev]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const existing = document.getElementById("story-viewer-portal");
    if (existing) {
      portalRef.current = existing;
      return;
    }
    const node = document.createElement("div");
    node.setAttribute("id", "story-viewer-portal");
    document.body.appendChild(node);
    portalRef.current = node;
    return () => {
      if (node.parentNode) node.parentNode.removeChild(node);
    };
  }, []);

  // Sync video pause
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
    if (!res.success) {
      toast.error("Couldn't delete");
      return;
    }
    toast.success("Story deleted");
    setShowDeleteConfirm(false);
    // Locally adjust: drop story; if group empty, advance/close
    if (group.stories.length === 1) {
      onChanged?.();
      onClose();
    } else {
      group.stories.splice(sIdx, 1);
      setSIdx((i) => Math.max(0, Math.min(i, group.stories.length - 1)));
      onChanged?.();
    }
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
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm grid place-items-center animate-fade-in">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-30 w-10 h-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Side nav (desktop) */}
      {(gIdx > 0 || sIdx > 0) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="hidden sm:grid absolute left-4 z-30 w-12 h-12 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
          aria-label="Previous"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goNext();
        }}
        className="hidden sm:grid absolute right-4 z-30 w-12 h-12 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
        aria-label="Next"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Stage */}
      <div
        className="relative w-full max-w-[420px] aspect-[9/16] max-h-[95vh] bg-black rounded-2xl overflow-hidden shadow-2xl select-none"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{
                  width:
                    i < sIdx ? "100%" : i === sIdx ? `${progress * 100}%` : "0%",
                  transition: i === sIdx ? "width 75ms linear" : "none",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-0 right-0 z-20 flex items-center gap-2 px-3 pt-3">
          <Avatar src={u.profilepic} name={name} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{name}</p>
            <p className="text-[10px] text-white/70">{timeAgo}</p>
          </div>
          {isVideo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMuted((m) => !m);
              }}
              className="w-9 h-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPaused((p) => !p);
            }}
            className="w-9 h-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label={paused ? "Play" : "Pause"}
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="w-9 h-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Delete story"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tap zones */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
          aria-label="Previous"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
          aria-label="Next"
        />

        {/* Media */}
        {isVideo ? (
          <video
            ref={videoRef}
            key={story._id}
            src={story.mediaUrl}
            className="w-full h-full object-contain bg-black"
            autoPlay
            playsInline
            muted={muted}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
            onEnded={goNext}
          />
        ) : (
          <img
            src={story.mediaUrl}
            alt=""
            className="w-full h-full object-contain bg-black"
            draggable={false}
          />
        )}

        {/* Caption */}
        {story.caption && (
          <div className="absolute bottom-16 left-3 right-3 z-20 text-center">
            <p className="inline-block px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white text-sm font-medium">
              {story.caption}
            </p>
          </div>
        )}

         {/* Owner viewer count */}
         {(isOwner || isMineGroup) && (
           <button
             onClick={(e) => {
               e.stopPropagation();
               setShowViewers(true);
             }}
            className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-center gap-2 text-white text-sm font-semibold bg-black/55 backdrop-blur-md hover:bg-black/70 px-4 py-2 rounded-full transition-colors"
          >
            <Eye className="w-4 h-4" />
            {viewCount} {viewCount === 1 ? "view" : "views"}
          </button>
        )}
      </div>

      {showViewers && (
        <StoryViewersSheet
          storyId={story._id}
          onClose={() => setShowViewers(false)}
        />
      )}

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[110] grid place-items-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="card w-full max-w-sm p-5 space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Delete story</h3>
              <p className="text-sm text-muted-foreground">
                This story will be removed immediately. You can’t undo this action.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-glass flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    portalRef.current
  );
}
