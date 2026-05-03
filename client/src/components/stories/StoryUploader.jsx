import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Image as ImageIcon, Loader2, Type, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { uploadStoryMedia, createStory } from "../../apiCalls/users.js";

const MAX_BYTES = 15 * 1024 * 1024;

export default function StoryUploader({ open, onClose, onPosted }) {
  const fileRef = useRef(null);
  const portalRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState("image");
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setPreviewUrl(null);
      setCaption("");
      setProgress(0);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const existing = document.getElementById("story-uploader-portal");
    if (existing) {
      portalRef.current = existing;
      return;
    }
    const node = document.createElement("div");
    node.setAttribute("id", "story-uploader-portal");
    document.body.appendChild(node);
    portalRef.current = node;
    return () => {
      if (node.parentNode) node.parentNode.removeChild(node);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;
  if (!portalRef.current) return null;

  const handlePick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("File must be under 15MB");
      return;
    }
    const isVideo = f.type.startsWith("video/");
    if (!isVideo && !f.type.startsWith("image/")) {
      toast.error("Only images or videos");
      return;
    }
    setFile(f);
    setMediaType(isVideo ? "video" : "image");
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handlePost = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    const up = await uploadStoryMedia(file, setProgress);
    if (!up.success || !up.url) {
      toast.error(up.message || "Upload failed");
      setBusy(false);
      return;
    }
    const res = await createStory(up.url, up.mediaType || mediaType, caption.trim());
    setBusy(false);
    if (res.success) {
      toast.success("Story posted");
      onPosted?.();
      onClose?.();
    } else {
      toast.error(res.message || "Could not post story");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/75 backdrop-blur-md p-4 animate-fade-in"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="card w-full max-w-md p-5 space-y-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Create story</h3>
          <button
            onClick={onClose}
            disabled={busy}
            className="btn btn-ghost btn-icon"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          onChange={handlePick}
          className="hidden"
        />

        {!previewUrl ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-[9/16] max-h-[55vh] rounded-2xl border-2 border-dashed border-glass-border-strong grid place-items-center text-muted-foreground hover:bg-glass-hover hover:text-foreground transition-colors"
          >
            <div className="text-center space-y-2 px-4">
              <Upload className="w-10 h-10 mx-auto" />
              <p className="text-sm font-semibold">Tap to choose</p>
              <p className="text-xs">Photo or video, up to 15MB</p>
            </div>
          </button>
        ) : (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[55vh]">
            {mediaType === "video" ? (
              <video src={previewUrl} controls className="w-full h-full object-contain" />
            ) : (
              <img src={previewUrl} alt="preview" className="w-full h-full object-contain" />
            )}
            {caption && (
              <p className="absolute bottom-3 left-3 right-3 text-center text-white text-sm font-semibold drop-shadow-lg bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1.5">
                {caption}
              </p>
            )}
          </div>
        )}

        {previewUrl && (
          <>
            <div className="relative">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                maxLength={120}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption (optional)"
                className="w-full pl-10 pr-3 py-2.5 rounded-full bg-glass border border-glass-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="btn btn-glass w-full justify-center"
            >
              <ImageIcon className="w-4 h-4" />
              Change media
            </button>
          </>
        )}

        {busy && progress > 0 && (
          <div className="h-1.5 w-full bg-glass rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} disabled={busy} className="btn btn-glass flex-1">
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={!file || busy}
            className="btn btn-primary flex-1"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share story"}
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Stories disappear after 24 hours
        </p>
      </div>
    </div>,
    portalRef.current
  );
}
