import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  likePost,
  addComment,
  getComments,
  sharePost,
  unsharePost,
  bookmarkPost,
  deletePost,
} from "../../apiCalls/post.js";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  Bookmark,
  MoreHorizontal,
  Trash2,
  Flag,
  Link2,
  Quote,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import { ROUTES } from "../../lib/constants.js";
import Avatar from "../../components/Avatar.jsx";
import { formatTime } from "../../components/CommonUI.jsx";
import QuoteEchoModal from "../../components/QuoteEchoModal.jsx";
import { moodForPost } from "../../lib/moods.js";
import Sticker from "../../components/ui-brutal/Sticker.jsx";

export default function PostCard({
  post,
  currentUserId,
  onShare,
  onUnshare,
  onDelete,
  index = 0,
  userQuickEchoes = [],
  postsById = {},
}) {
  const isRepost = !!(post.isRepost || post.originalPost);
  const isQuote = !!post.isQuote;
  const sharer = post.author || null;
  const resolvedOriginalPost =
    post.originalPost && typeof post.originalPost === "object" ? post.originalPost : null;
  const originalPostIdProp =
    post.originalPost && typeof post.originalPost !== "object"
      ? String(post.originalPost)
      : resolvedOriginalPost?._id;
  const originalPostFromFeed = originalPostIdProp ? postsById[String(originalPostIdProp)] : null;
  const display = originalPostFromFeed || resolvedOriginalPost || post;
  const isQuickEchoPost = isRepost && !isQuote;
  const actionPost = isQuote ? post : display;

  const [liked, setLiked] = useState(actionPost.likes?.includes(currentUserId));
  const [likesCount, setLikesCount] = useState(
    actionPost.likeCount ?? actionPost.likes?.length ?? 0,
  );
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [shareCount, setShareCount] = useState(actionPost.shareCount ?? 0);
  const commentCount = actionPost.commentCount ?? 0;
  const displayCreatedAt = isQuote ? post?.createdAt : display?.createdAt || post?.createdAt;
  const [bookmarked, setBookmarked] = useState(!!actionPost.bookmarked);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  useEffect(() => {
    setLiked(actionPost.likes?.includes(currentUserId));
    setLikesCount(actionPost.likeCount ?? actionPost.likes?.length ?? 0);
    setShareCount(actionPost.shareCount ?? 0);
    setBookmarked(!!actionPost.bookmarked);
  }, [actionPost._id, actionPost.likeCount, actionPost.shareCount, actionPost.bookmarked, currentUserId]);

  const menuRef = useRef(null);
  const { user } = useSelector((s) => s.userReducer);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLike = async () => {
    setLiked((v) => !v);
    setLikesCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    const res = await likePost(actionPost._id);
    if (!res.success) {
      setLiked((v) => !v);
      setLikesCount((c) => (liked ? c + 1 : Math.max(0, c - 1)));
    }
  };

  const handleBookmark = async () => {
    setBookmarked((v) => !v);
    const res = await bookmarkPost(actionPost._id);
    if (!res.success) setBookmarked((v) => !v);
    else toast.success(bookmarked ? "Removed from clippings" : "Saved to clippings");
  };

  const toggleComments = async () => {
    setShowComments((v) => !v);
    if (!commentsLoaded) {
      const res = await getComments(actionPost._id);
      if (res.success) setComments(res.data || []);
      setCommentsLoaded(true);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    const text = comment;
    setComment("");
    const res = await addComment(actionPost._id, text);
    if (res.success) {
      setComments((c) => [res.data, ...c]);
      setShowComments(true);
      setCommentsLoaded(true);
    } else {
      toast.error("Couldn't add reply");
      setComment(text);
    }
  };

  const hasQuickEchoed = userQuickEchoes.some((id) => String(id) === String(actionPost?._id));

  const handleQuickEcho = async () => {
    if (hasQuickEchoed) {
      const res = await unsharePost(actionPost._id);
      if (res.success) {
        setShareCount((p) => Math.max(0, p - 1));
        toast.success("Echo removed");
        onUnshare?.(res.data?.repostId);
      } else toast.error(res.message || "Undo failed");
      return;
    }
    const res = await sharePost(actionPost._id);
    if (res.success) {
      setShareCount((p) => p + 1);
      toast.success("Echoed");
      onShare?.(res.data);
    } else if (res.statusCode === 409) toast.error("Already echoed");
    else toast.error(res.message || "Echo failed");
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${ROUTES.POST_DETAIL(display._id)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy");
    }
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!confirm("Delete this post?")) return;
    const res = await deletePost(display._id);
    if (res.success) {
      setDeleted(true);
      toast.success("Post deleted");
      onDelete?.(display._id);
    } else toast.error(res.message || "Couldn't delete");
  };

  const openDetail = () => {
    const detailId = isQuote ? post._id : actionPost._id;
    navigate(ROUTES.POST_DETAIL(detailId), { state: { modal: true } });
  };

  if (deleted) return null;

  const originalPost = resolvedOriginalPost || originalPostFromFeed;
  const originalAuthor =
    originalPost?.author && typeof originalPost.author === "object" ? originalPost.author : null;
  const author = isRepost && !isQuote && originalAuthor ? originalAuthor : post.author || {};
  const authorName = `${author.firstname || ""} ${author.lastname || ""}`.trim();
  const sharerName = sharer ? `${sharer.firstname || ""} ${sharer.lastname || ""}`.trim() : "";
  const sharerIsMe = sharer && currentUserId && String(sharer._id) === String(currentUserId);
  const isAuthor = currentUserId && String(author._id) === String(currentUserId);

  const mood = moodForPost(display);
  const useDropcap = !isQuote && (display.text?.length || 0) >= 120 && !display.image;

  const ribbon = isQuickEchoPost && sharer && (
    <div
      className="flex items-center gap-2 px-4 py-1.5 -mx-[2px] -mt-[2px]"
      style={{
        background: "var(--paper-2)",
        color: "var(--ink)",
        borderRadius: 0,
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <Repeat2 className="w-3.5 h-3.5" />
      <span className="font-mono text-[10px] uppercase tracking-widest font-bold">
        {sharerIsMe ? "You" : sharerName || "Someone"} echoed · {formatTime(post.createdAt)}
      </span>
    </div>
  );

  return (
    <>
      {quoteModalOpen && (
        <QuoteEchoModal
          post={display}
          user={user}
          onClose={() => setQuoteModalOpen(false)}
          onEchoed={(echo) => {
            setShareCount((prev) => prev + 1);
            onShare?.(echo);
          }}
        />
      )}

      <article
        className="brutal-card relative anim-fade-in-up"
        style={{
          background: "var(--paper)",
          animationDelay: `${Math.min(index, 6) * 40}ms`,
          overflow: "hidden",
        }}
      >
        {ribbon}

        {/* Quote echo wrapper text */}
        {isQuote && (
          <div className="px-4 sm:px-5 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Avatar src={post.author?.profilepic} name={`${post.author?.firstname || ""}`} size={28} />
              <span className="text-sm font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {post.author?.firstname} {post.author?.lastname}
              </span>
              <span className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>
                · {formatTime(post.createdAt)}
              </span>
            </div>
            <p className="text-base leading-relaxed whitespace-pre-wrap break-words" style={{ color: "var(--ink)" }}>
              {post.text}
            </p>
          </div>
        )}

        <div className="p-4 sm:p-5">
          {/* Header */}
          <header className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link to={ROUTES.PROFILE_USER(author._id)}>
                <Avatar src={author.profilepic} name={authorName} size={44} />
              </Link>
              <div className="min-w-0">
                <Link
                  to={ROUTES.PROFILE_USER(author._id)}
                  className="text-base font-bold leading-tight"
                  style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
                >
                  {authorName || "Unknown"}
                </Link>
                <p className="font-mono text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "var(--muted-2)" }}>
                  {formatTime(displayCreatedAt)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              {mood && !isQuote && (
                <Sticker
                  rotate={3}
                  style={{ background: mood.color, color: "var(--ink)" }}
                  className="text-[10px]"
                >
                  <span aria-hidden>{mood.emoji}</span> {mood.label}
                </Sticker>
              )}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="brutal-btn brutal-btn-ghost brutal-btn-icon"
                  aria-label="More options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 z-30 min-w-[180px] anim-scale-in p-1"
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <MenuItem onClick={handleCopyLink} icon={Link2} label="Copy link" />
                    <MenuItem
                      onClick={() => {
                        setMenuOpen(false);
                        handleBookmark();
                      }}
                      icon={Bookmark}
                      label={bookmarked ? "Remove clipping" : "Clip post"}
                    />
                    {isAuthor ? (
                      <MenuItem onClick={handleDelete} icon={Trash2} label="Delete post" danger />
                    ) : (
                      <MenuItem
                        onClick={() => {
                          setMenuOpen(false);
                          toast.success("Reported. Thanks.");
                        }}
                        icon={Flag}
                        label="Report post"
                        danger
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Body (non-quote) */}
          {!isQuote && display.text && (
            <button onClick={openDetail} className="text-left w-full">
              <p
                className={`text-[17px] leading-relaxed whitespace-pre-wrap break-words ${useDropcap ? "dropcap" : ""}`}
                style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}
              >
                {display.text}
              </p>
            </button>
          )}
          {!isQuote && display.image && (
            <button onClick={openDetail} className="block w-full mt-3 group">
              <div style={{ border: "2px solid var(--ink)", boxShadow: "var(--sh-1)" }}>
                <img
                  src={display.image}
                  alt=""
                  loading="lazy"
                  className="w-full max-h-[480px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            </button>
          )}

          {/* Quote-echo nested original card */}
          {isQuote && (
            <button
              onClick={openDetail}
              className="block w-full mt-3 text-left p-3"
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--line)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Avatar src={originalAuthor?.profilepic} name={`${originalAuthor?.firstname || ""}`} size={22} />
                <span className="text-xs font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  {originalAuthor?.firstname} {originalAuthor?.lastname}
                </span>
                <span className="font-mono text-[10px]" style={{ color: "var(--muted-2)" }}>
                  · {formatTime(originalPost?.createdAt)}
                </span>
              </div>
              <p className="text-sm line-clamp-3 leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                {originalPost?.text}
              </p>
              {originalPost?.image && (
                <img
                  src={originalPost.image}
                  alt=""
                  className="mt-2 max-h-40 w-full object-cover"
                  style={{ border: "1px solid var(--line)" }}
                />
              )}
            </button>
          )}

          {/* Stats line */}
          <div
            className="flex items-center gap-3 mt-4 font-mono text-[11px] uppercase tracking-wider"
            style={{ color: "var(--muted-2)" }}
          >
            <span>{likesCount} likes</span>
            <span>·</span>
            <span>{commentCount} replies</span>
            <span>·</span>
            <span>{shareCount} echoes</span>
          </div>

          {/* Actions */}
          <div
            className="flex items-stretch mt-3 pt-3"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <ActionButton onClick={handleLike} active={liked} label="LIKE">
              <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
            </ActionButton>
            <ActionButton onClick={toggleComments} label="REPLY">
              <MessageCircle className="w-4 h-4" />
            </ActionButton>
            <ActionButton onClick={handleQuickEcho} active={hasQuickEchoed} label="ECHO">
              <Repeat2 className="w-4 h-4" />
            </ActionButton>
            <ActionButton onClick={() => setQuoteModalOpen(true)} label="QUOTE">
              <Quote className="w-4 h-4" />
            </ActionButton>
            <ActionButton onClick={handleBookmark} active={bookmarked} label="CLIP">
              <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-current" : ""}`} />
            </ActionButton>
          </div>

          {/* Comment composer */}
          <div className="mt-3 flex items-center gap-2">
            <Avatar src={user?.profilepic} name={`${user?.firstname || ""}`} size={36} />
            <div className="flex-1 relative">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Write a reply…"
                className="brutal-input pr-12"
                style={{ paddingTop: 9, paddingBottom: 9 }}
              />
              <button
                onClick={handleComment}
                disabled={!comment.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center"
                style={{
                  width: 32,
                  height: 32,
                  background: comment.trim() ? "var(--acid)" : "var(--paper-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-sm)",
                  cursor: comment.trim() ? "pointer" : "not-allowed",
                }}
                aria-label="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Comments */}
          {showComments && (
            <div className="mt-4 space-y-3 anim-fade-in">
              {comments.length === 0 ? (
                <p className="font-mono text-[11px] uppercase tracking-wider text-center py-2" style={{ color: "var(--muted-2)" }}>
                  No replies yet — break the silence
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c._id} className="flex gap-2.5">
                    <Avatar src={c.author?.profilepic} name={c.author?.firstname || ""} size={32} />
                    <div className="flex-1">
                      <div
                        className="px-3 py-2"
                        style={{
                          background: "var(--paper-2)",
                          border: "1px solid var(--line)",
                          borderRadius: "var(--r-sm)",
                        }}
                      >
                        <p className="text-xs font-bold" style={{ fontFamily: "var(--font-display)" }}>
                          {c.author?.firstname} {c.author?.lastname}
                        </p>
                        <p className="text-sm" style={{ color: "var(--ink)" }}>
                          {c.text}
                        </p>
                      </div>
                      <p className="font-mono text-[10px] mt-1 ml-2" style={{ color: "var(--muted-2)" }}>
                        {formatTime(c.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </article>
    </>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors"
      style={{ color: danger ? "var(--riso-red)" : "var(--ink)" }}
      onMouseOver={(e) => (e.currentTarget.style.background = "var(--paper-2)")}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function ActionButton({ children, onClick, active, label }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-all"
      style={{
        color: active ? "var(--ink)" : "var(--muted-2)",
        background: active ? "var(--acid)" : "transparent",
      }}
      onMouseOver={(e) => {
        if (!active) e.currentTarget.style.background = "var(--paper-2)";
      }}
      onMouseOut={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
