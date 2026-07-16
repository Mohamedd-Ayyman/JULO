import React, { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import Avatar from "./Avatar.jsx";
import { sharePost } from "../apiCalls/post.js";
import toast from "react-hot-toast";
import { formatTime } from "./CommonUI.jsx";

export default function QuoteEchoModal({ post, user, onClose, onEchoed }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const res = await sharePost(post._id, text);
    setLoading(false);
    if (res.success) {
      toast.success("Echoed with your thoughts!");
      onEchoed?.(res.data);
      onClose();
    } else {
      toast.error(res.message || "Echo failed");
    }
  };

  const author = post.author || {};
  const authorName = `${author.firstname || ""} ${author.lastname || ""}`.trim();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" style={{ background: "rgba(20,17,15,0.6)" }}>
      <div className="brutal-card w-full max-w-lg overflow-hidden animate-scale-in flex flex-col max-h-[90vh]" style={{ background: "var(--paper)" }}>
        <header className="flex items-center justify-between p-4 border-b-2 flex-shrink-0" style={{ borderColor: "var(--line-soft)" }}>
          <h2 className="font-display text-lg font-black" style={{ color: "var(--ink)" }}>Quote Echo</h2>
          <button onClick={onClose} className="brutal-btn brutal-btn-ghost brutal-btn-icon">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="flex gap-3">
            <Avatar src={user?.profilepic} name={user?.firstname} size={40} />
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add your thoughts..."
              className="flex-1 bg-transparent resize-none outline-none text-base py-1 min-h-[100px]"
              style={{ color: "var(--ink)", fontFamily: "var(--font-sans)" }}
              rows={3}
            />
          </div>

          {/* Preview of the post being echoed */}
          <div className="p-3" style={{ background: "var(--paper-2)", border: "2px solid var(--ink)", borderRadius: "var(--r-md)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Avatar src={author.profilepic} name={authorName} size={20} />
              <span className="text-xs font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{authorName}</span>
              <span className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>· {formatTime(post.createdAt)}</span>
            </div>
            <p className="text-sm line-clamp-3 leading-relaxed" style={{ color: "var(--ink)" }}>{post.text}</p>
            {post.image && (
              <img src={post.image} alt="" className="mt-2 max-h-40 w-full object-cover" style={{ border: "2px solid var(--ink)", borderRadius: "var(--r-sm)" }} />
            )}
          </div>
        </div>

        <footer className="flex justify-end p-4 border-t-2 flex-shrink-0" style={{ borderColor: "var(--line-soft)" }}>
          <button
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            className="brutal-btn brutal-btn-primary px-6"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Echo
          </button>
        </footer>
      </div>
    </div>
  );
}