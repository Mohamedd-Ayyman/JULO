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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
      <div className="brutal-card w-full max-w-lg overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        <header className="flex items-center justify-between p-4 border-b-2 border-foreground flex-shrink-0">
          <h2 className="font-display text-xl font-bold tracking-tight">Quote Echo</h2>
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
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-[15px] py-1 min-h-[100px]"
              rows={3}
            />
          </div>

          {/* Preview of the post being echoed */}
          <div className="brutal-card p-3 ml-13" style={{ marginLeft: 52 }}>
            <div className="flex items-center gap-2 mb-2">
              <Avatar src={author.profilepic} name={authorName} size={20} />
              <span className="text-xs font-display font-bold tracking-tight">{authorName}</span>
              <span className="font-mono text-[10px] text-muted-foreground">· {formatTime(post.createdAt)}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{post.text}</p>
            {post.image && (
              <img
                src={post.image}
                alt=""
                className="mt-2 rounded-md max-h-40 w-full object-cover border-2 border-foreground"
              />
            )}
          </div>
        </div>

        <footer className="flex justify-end p-4 border-t-2 border-foreground flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            className="brutal-btn brutal-btn-primary"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Echo
          </button>
        </footer>
      </div>
    </div>
  );
}
