import React, { useState, useRef } from "react";
import { createPost, uploadPostImage } from "../../apiCalls/post.js";
import { Image as ImageIcon, Smile, MapPin, X, Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../../components/Avatar.jsx";

const MAX_LEN = 500;

export default function CreatePost({ user, onPostCreated }) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
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
      const res = await createPost({ text: content, ...(imageUrl ? { image: imageUrl } : {}) });
      if (res.success) {
        setContent("");
        removeImage();
        onPostCreated?.(res.data);
        toast.success("Posted!");
      } else {
        toast.error(res.message || "Failed to post");
      }
    } finally {
      setLoading(false);
    }
  };

  const len = content.length;
  const counterClass = len >= MAX_LEN ? "over" : len >= MAX_LEN * 0.8 ? "near" : "ok";
  const canPost = (content.trim().length > 0 || imageFile) && len <= MAX_LEN && !loading;

  return (
    <div className="card p-4 animate-fade-in-up">
      <div className="flex gap-3">
        <Avatar src={user?.profilepic} name={`${user?.firstname || ""} ${user?.lastname || ""}`} size={42} />
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="What's on your mind, ✨?"
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-base leading-relaxed"
            rows={focused || content || imageFile ? 3 : 1}
            maxLength={MAX_LEN + 50}
          />

          {previewUrl && (
            <div className="relative mt-2 animate-scale-in">
              <img
                src={previewUrl}
                alt=""
                className="rounded-xl w-full max-h-80 object-cover border border-glass-border"
              />
              <button
                onClick={removeImage}
                type="button"
                className="absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-full bg-black/60 backdrop-blur text-white hover:bg-black/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {(focused || content || imageFile) && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-glass-border animate-fade-in">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn btn-ghost btn-icon"
                  title="Add image"
                >
                  <ImageIcon className="w-4 h-4 text-accent" />
                </button>
                <button type="button" className="btn btn-ghost btn-icon" title="Emoji">
                  <Smile className="w-4 h-4 text-warning" style={{ color: "var(--color-warning)" }} />
                </button>
                <button type="button" className="btn btn-ghost btn-icon" title="Location">
                  <MapPin className="w-4 h-4" style={{ color: "var(--color-accent-2, #f472b6)" }} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </div>
              <div className="flex items-center gap-3">
                <span className={`char-counter ${counterClass}`}>{len}/{MAX_LEN}</span>
                <button
                  onClick={handleSubmit}
                  disabled={!canPost}
                  className="btn btn-primary"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
