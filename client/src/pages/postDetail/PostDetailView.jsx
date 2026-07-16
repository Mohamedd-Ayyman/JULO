import React, { useEffect, useState } from "react";
import { getPost, getComments, addComment, likePost, sharePost, unsharePost, getFeed } from "../../apiCalls/post.js";
import { Heart, MessageCircle, Megaphone, Send, X, Loader2, Quote } from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import Avatar from "../../components/Avatar.jsx";
import { formatTime } from "../../components/CommonUI.jsx";
import QuoteEchoModal from "../../components/QuoteEchoModal.jsx";

export default function PostDetailView({ postId, onClose }) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [liked, setLiked] = useState(false);
  const [echoRipple, setEchoRipple] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [userQuickEchoes, setUserQuickEchoes] = useState([]);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getFeed();
      if (cancelled) return;
      if (res.success) {
        const echoes = (res.data || [])
          .filter((p) => p.isRepost && !p.isQuote && p.author && String(p.author._id) === String(user?._id))
          .map((p) => p.originalPost?._id || p.originalPost)
          .filter(Boolean);
        setUserQuickEchoes(echoes);
      }
    })();
    return () => { cancelled = true; };
  }, [user?._id]);

  const submitComment = async () => {
    if (!comment.trim()) return;
    const text = comment;
    setComment("");
    const res = await addComment(postId, text);
    if (res.success) {
      setComments((c) => [res.data, ...c]);
      toast.success("Echoed back!");
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

  const handleQuickEcho = async () => {
    if (!post) return;
    const display = post?.originalPost || post;
    const hasQuickEchoed = userQuickEchoes.some((id) => String(id) === String(display?._id));

    if (hasQuickEchoed) {
      const res = await unsharePost(display._id);
      if (res.success) {
        setPost((p) => ({ ...p, shareCount: Math.max(0, (p.shareCount || 0) - 1) }));
        setUserQuickEchoes((prev) => prev.filter((id) => String(id) !== String(display._id)));
        toast.success("Echo removed");
      } else toast.error(res.message || "Undo failed");
      return;
    }

    setEchoRipple(true);
    setTimeout(() => setEchoRipple(false), 400);
    const res = await sharePost(display._id);
    if (res.success) {
      setPost((p) => ({ ...p, shareCount: (p.shareCount || 0) + 1 }));
      setUserQuickEchoes((prev) => [...prev, display._id]);
      toast.success("Echoed");
    } else {
      if (res.statusCode === 409) {
        toast.error("You already echoed this post");
      } else {
        toast.error(res.message || "Echo failed");
      }
    }
  };

  const handleQuoteEcho = () => {
    setQuoteModalOpen(true);
  };

  if (loading) {
    return (
      <Wrapper onClose={onClose}>
        <div className="flex justify-center py-16">
          <div className="spinner" />
        </div>
      </Wrapper>
    );
  }

  if (!post) {
    return (
      <Wrapper onClose={onClose}>
        <p className="py-12 text-center" style={{ color: "var(--muted-2)" }}>Post not found.</p>
      </Wrapper>
    );
  }

  const isRepost = !!(post?.isRepost || post?.originalPost);
  const isQuote = !!post?.isQuote;
  const sharer = post?.author || null;
  const display = post?.originalPost || post;

  const originalPost = post?.originalPost && typeof post.originalPost === "object" ? post.originalPost : null;
  const originalAuthor = originalPost?.author && typeof originalPost.author === "object" ? originalPost.author : null;
  const author = (isRepost && !isQuote && originalAuthor) ? originalAuthor : (post.author || {});
  const authorName = `${author.firstname || ""} ${author.lastname || ""}`.trim();
  const sharerName = sharer ? `${sharer.firstname || ""} ${sharer.lastname || ""}`.trim() : "";
  const sharerIsMe = sharer && user?._id && String(sharer._id) === String(user._id);

  return (
    <Wrapper onClose={onClose}>
      {quoteModalOpen && (
        <QuoteEchoModal 
          post={display} 
          user={user} 
          onClose={() => setQuoteModalOpen(false)} 
          onEchoed={() => setPost(p => ({ ...p, shareCount: (p.shareCount || 0) + 1 }))}
        />
      )}

      <div className={`relative overflow-hidden rounded-2xl ${echoRipple ? "echo-ripple-active" : ""}`}>
        {echoRipple && <div className="echo-ripple-effect" />}
        
        {/* Repost banner */}
        {isRepost && !isQuote && sharer && (
          <div className="flex items-center gap-1.5 text-xs mb-3 px-1" style={{ color: "var(--muted-2)" }}>
            <Megaphone className="w-3.5 h-3.5" />
            <span>{sharerIsMe ? "You" : sharerName || "Someone"} echoed</span>
          </div>
        )}

        {/* Author */}
        <div className="flex items-center gap-3 mb-4 animate-fade-in">
          <Avatar src={author.profilepic} name={authorName} size={44} ring />
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{authorName || "Unknown"}</p>
            <p className="text-xs" style={{ color: "var(--muted-2)" }}>{formatTime(isQuote ? post?.createdAt : (display?.createdAt || post?.createdAt))}</p>
          </div>
        </div>

        {/* Content */}
        {isQuote ? (
          <div className="space-y-4 mb-4">
            <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ink)" }}>{post.text}</p>
            <div className="p-4" style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Avatar src={originalAuthor?.profilepic} name={`${originalAuthor?.firstname || ""}`} size={24} />
                <span className="text-sm font-bold" style={{ fontFamily: "var(--font-display)" }}>{originalAuthor?.firstname} {originalAuthor?.lastname}</span>
                <span className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>· {formatTime(originalPost.createdAt)}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>{originalPost.text}</p>
              {originalPost.image && (
                <img src={originalPost.image} alt="" className="mt-3 max-h-60 w-full object-cover" style={{ border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }} />
              )}
            </div>
          </div>
        ) : (
          <>
            {display?.text && <p className="text-[15px] leading-relaxed whitespace-pre-wrap mb-4" style={{ color: "var(--ink)" }}>{display.text}</p>}
            {display?.image && (
              <img src={display.image} alt="" className="w-full max-h-[60vh] object-cover mb-4" style={{ border: "1px solid var(--line)", borderRadius: "var(--r-md)" }} />
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-6 py-3 border-y mb-4" style={{ borderColor: "var(--line-soft)" }}>
          <button
            onClick={handleLike}
            className="flex items-center gap-2 text-sm font-bold transition-transform"
            style={{ color: liked ? "var(--riso-red)" : "var(--muted-2)" }}
          >
            <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
            {display?.likeCount || 0}
          </button>

          <div className="flex items-center gap-2 font-mono text-[11px] font-bold" style={{ color: "var(--muted-2)" }}>
            <MessageCircle className="w-5 h-5" />
            {display?.commentCount || 0}
          </div>

          <button
            onClick={handleQuickEcho}
            className="flex items-center gap-2 text-sm font-bold transition-transform"
            style={{ color: userQuickEchoes.some((id) => String(id) === String(display?._id)) ? "var(--acid)" : "var(--muted-2)" }}
          >
            <Megaphone className="w-5 h-5" />
            {display?.shareCount || 0}
          </button>

          <button
            onClick={handleQuoteEcho}
            className="flex items-center gap-2 text-sm font-bold transition-transform"
            style={{ color: "var(--muted-2)" }}
          >
            <Quote className="w-5 h-5" />
            Quote
          </button>
        </div>
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
            className="brutal-input text-sm"
            style={{ paddingTop: 10, paddingBottom: 10, borderRadius: "var(--r-pill)" }}
          />
          <button
            onClick={submitComment}
            disabled={!comment.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center"
            style={{
              width: 32,
              height: 32,
              background: comment.trim() ? "var(--acid)" : "var(--paper-2)",
              border: "1px solid var(--line)",
              borderRadius: "50%",
              cursor: comment.trim() ? "pointer" : "not-allowed",
            }}
            aria-label="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-3 stagger">
        {comments.length === 0 && (
          <p className="font-mono text-[11px] text-center py-4" style={{ color: "var(--muted-2)" }}>No comments yet. Start the conversation.</p>
        )}
        {comments.map((c) => (
          <div key={c._id} className="flex gap-2.5">
            <Avatar src={c.author?.profilepic} name={c.author?.firstname || ""} size={34} />
            <div className="flex-1">
              <div className="px-3.5 py-2" style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
                <p className="text-xs font-bold" style={{ fontFamily: "var(--font-display)" }}>{c.author?.firstname} {c.author?.lastname}</p>
                <p className="text-sm" style={{ color: "var(--ink)" }}>{c.text}</p>
              </div>
              <p className="font-mono text-[10px] mt-1 ml-3" style={{ color: "var(--muted-2)" }}>{formatTime(c.createdAt)}</p>
            </div>
          </div>
        ))}
        {hasMore && comments.length > 0 && (
          <div className="pt-1 text-center">
            <button onClick={loadMore} disabled={loadingMore} className="font-mono text-[11px] font-bold story-link" style={{ color: "var(--ink)" }}>
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
        <h2 className="font-display text-lg font-black" style={{ color: "var(--ink)" }}>Post</h2>
        {onClose && (
          <button onClick={onClose} className="brutal-btn brutal-btn-ghost brutal-btn-icon">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
