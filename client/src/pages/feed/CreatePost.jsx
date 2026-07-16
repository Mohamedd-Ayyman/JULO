import React, { useState, useRef } from "react";
import { createPost, uploadPostImage } from "../../apiCalls/post.js";
import { Image as ImageIcon, X, Loader2, Send } from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../../components/Avatar.jsx";
import MoodPicker from "../../components/feed/MoodPicker.jsx";
import { MOOD_BY_ID } from "../../lib/moods.js";

const MAX_LEN = 500;

export default function CreatePost({ user, onPostCreated }) {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setImageFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const removeImage = () => {
    setImageFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageFile) return;
    setLoading(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        const up = await uploadPostImage(imageFile);
        if (up.success) imageUrl = up.data?.url || up.data;
        else toast.error("Image upload failed");
      }
      const res = await createPost({
        text: content,
        ...(imageUrl ? { image: imageUrl } : {}),
        ...(mood ? { mood } : {}),
      });
      if (res.success) {
        // Attach mood locally even if backend ignores it
        const localPost = mood ? { ...res.data, mood } : res.data;
        setContent("");
        setMood(null);
        removeImage();
        onPostCreated?.(localPost);
        toast.success("Filed!");
      } else toast.error(res.message || "Failed to post");
    } finally {
      setLoading(false);
    }
  };

  const len = content.length;
  const counterColor =
    len >= MAX_LEN ? "var(--riso-red)" : len >= MAX_LEN * 0.8 ? "var(--riso-yellow)" : "var(--muted-2)";
  const canPost = (content.trim().length > 0 || imageFile) && len <= MAX_LEN && !loading;
  const moodMeta = mood ? MOOD_BY_ID[mood] : null;

  return (
    <div className="brutal-card p-4 sm:p-5 anim-fade-in-up relative" style={{ background: "var(--paper)" }}>
      <span className="absolute -top-3 left-8 tape" />
      <p className="eyebrow mb-2">File a dispatch</p>
      <div className="flex gap-3">
        <Avatar src={user?.profilepic} name={`${user?.firstname || ""} ${user?.lastname || ""}`} size={42} />
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's the headline?"
            className="w-full bg-transparent resize-none outline-none text-lg leading-snug font-display"
            style={{ color: "var(--ink)" }}
            rows={3}
            maxLength={MAX_LEN + 50}
          />

          {previewUrl && (
            <div className="relative mt-2 anim-scale-in" style={{ border: "2px solid var(--ink)", boxShadow: "var(--sh-1)" }}>
              <img src={previewUrl} alt="" className="w-full max-h-80 object-cover" />
              <button
                onClick={removeImage}
                type="button"
                className="absolute top-2 right-2 w-8 h-8 grid place-items-center"
                style={{ background: "var(--ink)", color: "var(--paper)", border: "2px solid var(--ink)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="mt-3 pt-3 ink-rule-thin">
            <p className="eyebrow mb-2">Pick a mood</p>
            <MoodPicker value={mood} onChange={setMood} />
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 ink-rule-thin">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="brutal-btn brutal-btn-ghost brutal-btn-icon"
                title="Add image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              {moodMeta && (
                <span className="font-mono text-[11px] uppercase ml-1" style={{ color: "var(--muted-2)" }}>
                  · mood: <strong style={{ color: "var(--ink)" }}>{moodMeta.label}</strong>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] font-bold" style={{ color: counterColor }}>
                {len}/{MAX_LEN}
              </span>
              <button onClick={handleSubmit} disabled={!canPost} className="brutal-btn brutal-btn-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Publish
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
