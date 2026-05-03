import React, { useState, useRef, useCallback } from "react";
import { Plus, Image as ImageIcon, X } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import Avatar from "./Avatar.jsx";
import { useOptimisticAvatar } from "../hooks/use-optimistic.js";
import { uploadAvatar } from "../apiCalls/users.js";
import toast from "react-hot-toast";

/**
 * StoriesRail — horizontal story list with:
 *   - Live backend stories from /api/stories
 *   - "Your story" with upload dialog + optimistic preview
 *   - View tracking via markStoryViewed
 */
export default function StoriesRail({ onOpenStory }) {
  const { user } = useSelector((s) => s.userReducer);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myStories, setMyStories] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Load stories on mount
  React.useEffect(() => {
    (async () => {
      const { getStories } = await import("../apiCalls/users.js");
      const res = await getStories();
      if (res.success) {
        setStories(res.data || []);
      }
      // Load my stories
      const { default: axios } = await import("axios");
      const token = localStorage.getItem("token");
      const myRes = await axios.get("/api/stories/mine", { headers: { authorization: `Bearer ${token}` } });
      if (myRes.data.success) setMyStories(myRes.data.data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="card p-3 mt-4 animate-fade-in">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {/* ── Your story (with upload) ───────────────────────────────── */}
        <YourStoryItem user={user} myStories={myStories} />

        {/* ── Other users' stories ──────────────────────────────────── */}
        {loading
          ? [1, 2, 3].map((i) => <StorySkeleton key={i} />)
          : stories.map((group) => (
              <StoryItem
                key={group._id}
                group={group}
                onOpen={() => onOpenStory?.(group)}
              />
            ))}
      </div>
    </div>
  );
}

/* ── Your story with upload ──────────────────────────────────────────── */

function YourStoryItem({ user, myStories }) {
  const dispatch = useDispatch();
  const fileRef = useRef(null);
  const [showDialog, setShowDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { optimisticUpload, setPreview } = useOptimisticAvatar({
    currentAvatar: user?.profilepic,
  });

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    setSelectedFile(f);
    const blob = URL.createObjectURL(f);
    setPreviewUrl(blob);
    setShowDialog(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    // Upload story media first
    const formData = new FormData();
    formData.append("media", selectedFile);
    const token = localStorage.getItem("token");
    const { default: axios } = await import("axios");

    try {
      const res = await axios.post("/api/upload/story", formData, {
        headers: { authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        // Create story record
        const storyRes = await axios.post(
          "/api/stories/create",
          { mediaUrl: res.data.url, mediaType: res.data.mediaType || "image" },
          { headers: { authorization: `Bearer ${token}` } }
        );

        if (storyRes.data.success) {
          toast.success("Story posted!");
          setShowDialog(false);
          setSelectedFile(null);
          setPreviewUrl(null);
        } else {
          toast.error(storyRes.data.message || "Failed to post story");
        }
      } else {
        toast.error("Upload failed");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setUploading(false);
    }
  };

  const hasActiveStory = myStories.length > 0;

  return (
    <>
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div className="relative">
          <Avatar src={user?.profilepic} name={user?.firstname || ""} size={56} ring={hasActiveStory} />
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-5 h-5 grid place-items-center rounded-full bg-gradient-primary border-2 border-background hover:scale-110 transition-transform"
          >
            <Plus className="w-3 h-3 text-white" strokeWidth={3} />
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">
          {hasActiveStory ? "Your story" : "Add story"}
        </span>
      </div>

      {/* Upload dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card max-w-sm w-full p-5 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Create story</h3>
              <button onClick={() => { setShowDialog(false); setSelectedFile(null); setPreviewUrl(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewUrl && (
              <div className="relative rounded-lg overflow-hidden bg-black/20">
                <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-contain rounded-lg" />
              </div>
            )}

            <button
              onClick={() => fileRef.current?.click()}
              className="btn btn-glass w-full justify-center"
            >
              <ImageIcon className="w-4 h-4" />
              {previewUrl ? "Change photo" : "Choose photo"}
            </button>

            <div className="flex gap-2">
              <button onClick={() => { setShowDialog(false); setSelectedFile(null); setPreviewUrl(null); }} className="btn btn-glass flex-1">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="btn btn-primary flex-1"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Post story"
                )}
              </button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Stories expire after 24 hours
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Story item (other users) ────────────────────────────────────────── */

function StoryItem({ group, onOpen }) {
  const user = group.user || {};
  const name = `${user.firstname || ""} ${user.lastname || ""}`.trim();
  const hasUnseen = group.hasUnseen;

  return (
    <button
      onClick={onOpen}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
    >
      <span
        className={`p-[2px] rounded-full transition-transform group-hover:scale-110 ${
          hasUnseen ? "bg-gradient-accent" : "bg-gradient-primary"
        }`}
      >
        <span className="block p-[2px] rounded-full bg-background">
          <Avatar src={user.profilepic} name={name} size={52} />
        </span>
        {hasUnseen && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-error border-2 border-background" />}
      </span>
      <span className="text-[10px] text-foreground-soft font-medium truncate max-w-[52px]">{name.split(" ")[0]}</span>
    </button>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────── */

function StorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
      <div className="w-14 h-14 rounded-full skeleton" />
      <div className="w-10 h-2.5 rounded skeleton" />
    </div>
  );
}