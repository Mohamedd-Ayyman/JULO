import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Image as ImageIcon, X, Eye, ChevronLeft, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
import { axiosInstance } from "../apiCalls/index.js";
import Avatar from "./Avatar.jsx";
import { getStories, markStoryViewed, deleteStory } from "../apiCalls/users.js";
import toast from "react-hot-toast";

export default function StoriesRail() {
  const { user } = useSelector((s) => s.userReducer);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myStories, setMyStories] = useState([]);
  const [viewer, setViewer] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await getStories();
    if (res.success) setGroups(res.data || []);
    try {
      const myRes = await axiosInstance.get("/api/stories/mine");
      if (myRes.data.success) setMyStories(myRes.data.data || []);
    } catch {
      /* optional endpoint */
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const orderedGroups = React.useMemo(() => {
    const others = (groups || []).filter((g) => String(g.user?._id) !== String(user?._id));
    if (myStories.length > 0) {
      return [{ _id: "me", user, stories: myStories, hasUnseen: false, isMine: true }, ...others];
    }
    return others;
  }, [groups, myStories, user]);

  return (
    <div className="brutal-card p-3 mt-4 animate-fade-in">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        <YourStoryItem user={user} hasStory={myStories.length > 0} onUploaded={refresh}
          onOpen={() => myStories.length > 0 && setViewer({ groupIndex: orderedGroups.findIndex((g) => g.isMine) })} />
        {loading
          ? [1, 2, 3].map((i) => <StorySkeleton key={i} />)
          : orderedGroups.filter((g) => !g.isMine).map((group) => (
              <StoryItem key={group._id} group={group}
                onOpen={() => setViewer({ groupIndex: orderedGroups.findIndex((g) => g._id === group._id) })} />
            ))}
        {!loading && orderedGroups.length === 0 && (
          <p className="text-xs self-center px-3" style={{ color: "var(--muted-2)" }}>Follow people to see their stories.</p>
        )}
      </div>

      {viewer && (
        <StoryViewerInternal groups={orderedGroups} startGroupIndex={viewer.groupIndex}
          currentUserId={user?._id} onClose={() => setViewer(null)}
          onDeleted={() => { refresh(); setViewer(null); }} />
      )}
    </div>
  );
}

function YourStoryItem({ user, hasStory, onUploaded, onOpen }) {
  const fileRef = useRef(null);
  const [showDialog, setShowDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => { setShowDialog(false); setSelectedFile(null); setPreviewUrl(null); };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    setSelectedFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setShowDialog(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("media", selectedFile);
    try {
      const res = await axiosInstance.post("/api/upload/story", formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.success) {
        const storyRes = await axiosInstance.post("/api/stories/create", { mediaUrl: res.data.url, mediaType: res.data.mediaType || "image" });
        if (storyRes.data.success) { toast.success("Story posted!"); reset(); onUploaded?.(); }
        else toast.error(storyRes.data.message || "Failed to post story");
      } else toast.error("Upload failed");
    } catch { toast.error("Network error — please try again"); }
    finally { setUploading(false); }
  };

  const fullName = `${user?.firstname || ""} ${user?.lastname || ""}`.trim();

  return (
    <>
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div className="relative">
          <button onClick={() => hasStory && onOpen?.()} className="block" aria-label={hasStory ? "View your story" : "Your profile"}>
            <Avatar src={user?.profilepic} name={fullName} size={56} ring={hasStory} />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 grid place-items-center rounded-full hover:scale-110 transition-transform"
            style={{ background: "var(--acid)", border: "2px solid var(--ink)", boxShadow: "2px 2px 0 0 var(--ink)" }}
            aria-label="Add story"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} style={{ color: "var(--ink)" }} />
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>
          {hasStory ? "Your story" : "Add story"}
        </span>
      </div>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(20,17,15,0.6)" }}
          onClick={reset}
        >
          <div className="brutal-card max-w-md w-full p-5 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>Create story</h3>
              <button onClick={reset} className="brutal-btn brutal-btn-ghost brutal-btn-icon" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewUrl ? (
              <div className="relative overflow-hidden" style={{ background: "var(--ink)", borderRadius: "var(--r-lg)", aspectRatio: "9/16", maxHeight: "60vh" }}>
                {selectedFile?.type?.startsWith("video/") ? (
                  <video src={previewUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                )}
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed flex items-center justify-center"
                style={{ aspectRatio: "9/16", maxHeight: "40vh", borderColor: "var(--ink)", borderRadius: "var(--r-lg)", background: "var(--paper)" }}
              >
                <div className="text-center space-y-2 px-4">
                  <ImageIcon className="w-10 h-10 mx-auto" style={{ color: "var(--muted)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Choose photo or video</p>
                  <p className="text-xs" style={{ color: "var(--muted-2)" }}>Up to 10MB</p>
                </div>
              </button>
            )}

            {previewUrl && (
              <button onClick={() => fileRef.current?.click()} className="brutal-btn brutal-btn-outline w-full justify-center">
                <ImageIcon className="w-4 h-4" /> Change media
              </button>
            )}

            <div className="flex gap-2">
              <button onClick={reset} className="brutal-btn brutal-btn-outline flex-1">Cancel</button>
              <button onClick={handleUpload} disabled={!selectedFile || uploading} className="brutal-btn brutal-btn-primary flex-1">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post story"}
              </button>
            </div>

            <p className="text-xs text-center" style={{ color: "var(--muted-2)" }}>Stories disappear after 24 hours</p>
          </div>
        </div>
      )}
    </>
  );
}

function StoryItem({ group, onOpen }) {
  const u = group.user || {};
  const name = `${u.firstname || ""} ${u.lastname || ""}`.trim();
  const hasUnseen = group.hasUnseen;
  return (
    <button onClick={onOpen} className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
      <span className="p-[2px] rounded-full transition-transform group-hover:scale-105"
        style={{ background: hasUnseen ? "var(--acid)" : "var(--paper-2)", border: "2px solid var(--ink)" }}>
        <span className="block p-[2px] rounded-full" style={{ background: "var(--paper)" }}>
          <Avatar src={u.profilepic} name={name} size={52} />
        </span>
      </span>
      <span className="font-mono text-[10px] uppercase tracking-widest truncate max-w-[60px]" style={{ color: "var(--muted-2)" }}>
        {name.split(" ")[0] || "User"}
      </span>
    </button>
  );
}

function StorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
      <div className="skeleton" style={{ width: 56, height: 56 }} />
      <div className="skeleton" style={{ width: 40, height: 10 }} />
    </div>
  );
}

/* ── Story Viewer ──────────────────────────────────────────────────── */

const STORY_DURATION = 5000;

function StoryViewerInternal({ groups, startGroupIndex, currentUserId, onClose, onDeleted }) {
  const [groupIdx, setGroupIdx] = useState(startGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const elapsedRef = useRef(0);

  const group = groups[groupIdx];
  const story = group?.stories?.[storyIdx];
  const isOwner = story && currentUserId && String(group.user?._id) === String(currentUserId);

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) setStoryIdx((i) => i + 1);
    else if (groupIdx < groups.length - 1) { setGroupIdx((i) => i + 1); setStoryIdx(0); }
    else onClose();
  }, [group, storyIdx, groupIdx, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) setStoryIdx((i) => i - 1);
    else if (groupIdx > 0) {
      const prev = groups[groupIdx - 1];
      setGroupIdx((i) => i - 1);
      setStoryIdx(Math.max(0, (prev?.stories?.length || 1) - 1));
    }
  }, [storyIdx, groupIdx, groups]);

  useEffect(() => {
    setProgress(0); elapsedRef.current = 0; startRef.current = null;
    if (story?._id && !isOwner) markStoryViewed(story._id).catch(() => {});
  }, [groupIdx, storyIdx, story?._id, isOwner]);

  useEffect(() => {
    if (!story) return;
    const isVideo = story.mediaType === "video";
    if (isVideo) return;
    const tick = (ts) => {
      if (paused) { startRef.current = ts; rafRef.current = requestAnimationFrame(tick); return; }
      if (!startRef.current) startRef.current = ts;
      const dt = ts - startRef.current;
      startRef.current = ts;
      elapsedRef.current += dt;
      const p = Math.min(1, elapsedRef.current / STORY_DURATION);
      setProgress(p);
      if (p >= 1) { goNext(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [story, paused, goNext]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goNext, goPrev]);

  if (!story) return null;

  const u = group.user || {};
  const name = `${u.firstname || ""} ${u.lastname || ""}`.trim();
  const isVideo = story.mediaType === "video";
  const viewCount = story.viewCount ?? story.views?.length ?? 0;

  const handleDelete = async () => {
    if (!confirm("Delete this story?")) return;
    const res = await deleteStory(story._id);
    if (res.success) { toast.success("Story deleted"); onDeleted?.(); }
    else toast.error("Couldn't delete");
  };

  const timeAgo = (() => {
    if (!story.createdAt) return "";
    const diff = Date.now() - new Date(story.createdAt).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}m`;
    return `${h}h`;
  })();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in"
      style={{ background: "var(--ink)" }}
      onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
      onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}
    >
      <button onClick={onClose}
        className="absolute top-4 right-4 z-20 w-10 h-10 grid place-items-center rounded-full"
        style={{ background: "rgba(243,236,217,0.15)" }} aria-label="Close">
        <X className="w-5 h-5 text-white" />
      </button>

      {(groupIdx > 0 || storyIdx > 0) && (
        <button onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-2 sm:left-6 z-20 w-12 h-12 grid place-items-center rounded-full"
          style={{ background: "rgba(243,236,217,0.15)" }} aria-label="Previous">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}
      <button onClick={(e) => { e.stopPropagation(); goNext(); }}
        className="absolute right-2 sm:right-6 z-20 w-12 h-12 grid place-items-center rounded-full"
        style={{ background: "rgba(243,236,217,0.15)" }} aria-label="Next">
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      <div className="relative w-full max-w-[420px] aspect-[9/16] max-h-[95vh] overflow-hidden"
        style={{ background: "var(--ink)", borderRadius: "var(--r-lg)" }}
        onClick={(e) => e.stopPropagation()}>

        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(243,236,217,0.3)" }}>
              <div className="h-full bg-white" style={{
                width: i < storyIdx ? "100%" : i === storyIdx ? `${progress * 100}%` : "0%",
                transition: i === storyIdx ? "width 75ms linear" : "none",
              }} />
            </div>
          ))}
        </div>

        <div className="absolute top-5 left-0 right-0 z-10 flex items-center gap-2 px-3 pt-3">
          <Avatar src={u.profilepic} name={name} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{name}</p>
            <p className="text-[10px]" style={{ color: "rgba(243,236,217,0.7)" }}>{timeAgo}</p>
          </div>
          {isOwner && (
            <button onClick={handleDelete}
              className="w-9 h-9 grid place-items-center rounded-full"
              style={{ background: "rgba(243,236,217,0.15)" }} aria-label="Delete story">
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        {isVideo ? (
          <video key={story._id} src={story.mediaUrl} className="w-full h-full object-contain" style={{ background: "var(--ink)" }}
            autoPlay playsInline controls={false}
            onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
            onEnded={goNext} />
        ) : (
          <img src={story.mediaUrl} alt="" className="w-full h-full object-contain" style={{ background: "var(--ink)" }} />
        )}

        {isOwner && (
          <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-full"
            style={{ background: "rgba(0,0,0,0.55)" }}>
            <Eye className="w-4 h-4" />
            {viewCount} {viewCount === 1 ? "view" : "views"}
          </div>
        )}
      </div>
    </div>
  );
}