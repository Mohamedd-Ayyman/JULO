import React, { useEffect, useState } from "react";
import { getPost, getComments, addComment, likePost, sharePost } from "../../apiCalls/post.js";
import { Heart, MessageCircle, Share2, Send, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import Avatar from "../../components/Avatar.jsx";
import { formatTime } from "../../components/CommonUI.jsx";

export default function PostDetailView({ postId, onClose }) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [liked, setLiked] = useState(false);
  const { user } = useSelector((s) => s.userReducer);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [postRes, commentsRes] = await Promise.all([
        getPost(postId),
        getComments(postId, 1, 5),
      ]);
      if (cancelled) return;
      if (postRes.success) {
        setPost(postRes.data);
        setLiked(postRes.data.likes?.includes(user?._id));
      }
      if (commentsRes.success) {
        const arr = commentsRes.data || [];
        setComments(arr);
        setHasMore(arr.length === 5);
        setPage(1);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [postId, user?._id]);

  const submitComment = async () => {
    if (!comment.trim()) return;
    const text = comment;
    setComment("");
    const res = await addComment(postId, text);
    if (res.success) {
      setComments((c) => [res.data, ...c]);
      toast.success("Comment added");
    } else {
      setComment(text);
      toast.error("Failed");
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    const res = await getComments(postId, next, 5);
    if (res.success) {
      const arr = res.data || [];
      setComments((c) => [...c, ...arr]);
      setPage(next);
      if (arr.length < 5) setHasMore(false);
    }
    setLoadingMore(false);
  };

  const handleLike = async () => {
    if (!post) return;
    setLiked((v) => !v);
    setPost((p) => ({ ...p, likeCount: liked ? Math.max(0, (p.likeCount || 1) - 1) : (p.likeCount || 0) + 1 }));
    const res = await likePost(post._id);
    if (!res.success) setLiked((v) => !v);
  };

  const handleShare = async () => {
    if (!post) return;
    const res = await sharePost(post._id);
    if (res.success) {
      setPost((p) => ({ ...p, shareCount: (p.shareCount || 0) + 1 }));
      toast.success("Shared");
    } else toast.error(res.message || "Share failed");
  };

  if (loading) {
    return (
      <Wrapper onClose={onClose}>
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Wrapper>
    );
  }

  if (!post) {
    return (
      <Wrapper onClose={onClose}>
        <p className="text-muted-foreground py-12 text-center">Post not found.</p>
      </Wrapper>
    );
  }

  const author = post.author || {};
  const authorName = `${author.firstname || ""} ${author.lastname || ""}`.trim();

  return (
    <Wrapper onClose={onClose}>
      {/* Author */}
      <div className="flex items-center gap-3 mb-4 animate-fade-in">
        <Avatar src={author.profilepic} name={authorName} size={44} ring />
        <div>
          <p className="text-sm font-bold text-foreground">{authorName}</p>
          <p className="text-xs text-muted-foreground">{formatTime(post.createdAt)}</p>
        </div>
      </div>

      {/* Content */}
      {post.text && <p className="text-foreground text-[15px] leading-relaxed whitespace-pre-wrap mb-4">{post.text}</p>}
      {post.image && (
        <img src={post.image} alt="" className="rounded-xl border border-glass-border w-full max-h-[60vh] object-cover mb-4" />
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 py-3 border-y border-glass-border mb-4">
        <button
          onClick={handleLike}
          className="flex items-center gap-2 text-sm font-semibold transition-transform hover:scale-105"
          style={{ color: liked ? "var(--color-like)" : "var(--color-muted-foreground)" }}
        >
          <Heart className={`w-5 h-5 ${liked ? "fill-current heart-pop" : ""}`} />
          {post.likeCount || 0}
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <MessageCircle className="w-5 h-5" />
          {post.commentCount || comments.length}
        </div>
        <button onClick={handleShare} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-transform hover:scale-105">
          <Share2 className="w-5 h-5" />
          {post.shareCount || 0}
        </button>
      </div>

      {/* Compose */}
      <div className="mt-3 flex items-center gap-2 mb-4">
        <span className="flex-shrink-0 inline-flex items-center">
          <Avatar src={user?.profilepic} name={user?.firstname || ""} size={36} />
        </span>
        <div className="flex-1 relative flex items-center">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitComment()}
            placeholder="Add a comment…"
            className="input rounded-full text-sm h-10 py-0 pl-4 pr-12 w-full"
          />
          <button
            onClick={submitComment}
            disabled={!comment.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center rounded-full bg-gradient-primary text-white disabled:opacity-40 hover:scale-105 transition-transform"
            style={{ width: 32, height: 32 }}
            aria-label="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-3 stagger">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Start the conversation.</p>
        )}
        {comments.map((c) => (
          <div key={c._id} className="flex gap-2.5">
            <Avatar src={c.author?.profilepic} name={c.author?.firstname || ""} size={34} />
            <div className="flex-1">
              <div className="bg-glass-hover rounded-2xl rounded-tl-sm px-3.5 py-2">
                <p className="text-xs font-bold text-foreground">{c.author?.firstname} {c.author?.lastname}</p>
                <p className="text-sm text-foreground">{c.text}</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-3">{formatTime(c.createdAt)}</p>
            </div>
          </div>
        ))}
        {hasMore && comments.length > 0 && (
          <div className="pt-1 text-center">
            <button onClick={loadMore} disabled={loadingMore} className="text-xs text-primary font-semibold story-link">
              {loadingMore ? "Loading…" : "Load more comments"}
            </button>
          </div>
        )}
      </div>
    </Wrapper>
  );
}

function Wrapper({ children, onClose }) {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Post</h2>
        {onClose && (
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
