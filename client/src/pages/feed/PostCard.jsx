import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { likePost, addComment, getComments, sharePost, bookmarkPost, deletePost } from "../../apiCalls/post.js";
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  Bookmark,
  MoreHorizontal,
  Trash2,
  Flag,
  Link2,
  Repeat2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import { ROUTES } from "../../lib/constants.js";
import Avatar from "../../components/Avatar.jsx";
import { formatTime } from "../../components/CommonUI.jsx";

export default function PostCard({ post, currentUserId, onShare, onDelete, index = 0 }) {
  // If this is a repost wrapper, render the original post but with a banner above.
  const isRepost = !!(post.isRepost || post.originalPost);
  const sharer = post.author || post.sharedBy || null;
  const display = post.originalPost || post;

  const [liked, setLiked] = useState(display.likes?.includes(currentUserId));
  const [animate, setAnimate] = useState(false);
  const [likesCount, setLikesCount] = useState(display.likeCount ?? display.likes?.length ?? 0);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [shareCount, setShareCount] = useState(display.shareCount || 0);
  const [bookmarked, setBookmarked] = useState(!!display.bookmarked);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const menuRef = useRef(null);
  const { user } = useSelector((s) => s.userReducer);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handleLike = async () => {
    setLiked((v) => !v);
    setLikesCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    setAnimate(true);
    setTimeout(() => setAnimate(false), 500);
    const res = await likePost(display._id);
    if (!res.success) {
      setLiked((v) => !v);
      setLikesCount((c) => (liked ? c + 1 : Math.max(0, c - 1)));
    }
  };

  const handleBookmark = async () => {
    setBookmarked((v) => !v);
    const res = await bookmarkPost(display._id);
    if (!res.success) setBookmarked((v) => !v);
    else toast.success(bookmarked ? "Removed bookmark" : "Bookmarked");
  };

  const toggleComments = async () => {
    setShowComments((v) => !v);
    if (!commentsLoaded) {
      const res = await getComments(display._id);
      if (res.success) setComments(res.data || []);
      setCommentsLoaded(true);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    const text = comment;
    setComment("");
    const res = await addComment(display._id, text);
    if (res.success) {
      setComments((c) => [res.data, ...c]);
      setShowComments(true);
      setCommentsLoaded(true);
    } else {
      toast.error("Couldn't add comment");
      setComment(text);
    }
  };

  const handleShare = async () => {
    const res = await sharePost(display._id);
    if (res.success) {
      setShareCount((p) => p + 1);
      toast.success("Shared to your feed");
      onShare?.(res.data);
    } else toast.error(res.message || "Share failed");
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
    navigate(ROUTES.POST_DETAIL(display._id), { state: { modal: true } });
  };

  if (deleted) return null;

  const author = display.author || {};
  const authorName = `${author.firstname || ""} ${author.lastname || ""}`.trim();
  const sharerName = sharer
    ? `${sharer.firstname || ""} ${sharer.lastname || ""}`.trim()
    : "";
  const sharerIsMe = sharer && currentUserId && String(sharer._id) === String(currentUserId);
  const isAuthor = currentUserId && String(author._id) === String(currentUserId);

  return (
    <article
      className="card p-4 sm:p-5 animate-fade-in-up hover-lift"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Repost banner */}
      {isRepost && sharer && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Repeat2 className="w-3.5 h-3.5" />
          <span>🔁 {sharerIsMe ? "You" : sharerName} shared</span>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={ROUTES.PROFILE_USER(author._id)}>
            <Avatar src={author.profilepic} name={authorName} size={42} ring />
          </Link>
          <div className="min-w-0">
            <Link
              to={ROUTES.PROFILE_USER(author._id)}
              className="text-sm font-bold text-foreground truncate story-link"
            >
              {authorName || "Unknown"}
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatTime(display.createdAt)}
            </p>
          </div>
        </div>

        {/* 3-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="btn btn-ghost btn-icon"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 min-w-[180px] card p-1 animate-fade-in shadow-xl">
              <MenuItem onClick={handleCopyLink} icon={Link2} label="Copy link" />
              <MenuItem onClick={() => { setMenuOpen(false); handleBookmark(); }} icon={Bookmark} label={bookmarked ? "Remove bookmark" : "Save post"} />
              {isAuthor ? (
                <MenuItem onClick={handleDelete} icon={Trash2} label="Delete post" danger />
              ) : (
                <MenuItem onClick={() => { setMenuOpen(false); toast.success("Reported. Thank you."); }} icon={Flag} label="Report post" danger />
              )}
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      {display.text && (
        <button onClick={openDetail} className="text-left w-full">
          <p className="text-foreground text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {display.text}
          </p>
        </button>
      )}
      {display.image && (
        <button onClick={openDetail} className="block w-full mt-3 group">
          <div className="overflow-hidden rounded-xl border border-glass-border">
            <img
              src={display.image}
              alt=""
              loading="lazy"
              className="w-full max-h-[480px] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
        </button>
      )}

      {/* Stats */}
      {(likesCount > 0 || display.commentCount > 0 || shareCount > 0) && (
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          {likesCount > 0 && <span>{likesCount} {likesCount === 1 ? "like" : "likes"}</span>}
          {display.commentCount > 0 && <span>{display.commentCount} comments</span>}
          {shareCount > 0 && <span>{shareCount} shares</span>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-glass-border">
        <ActionButton
          onClick={handleLike}
          active={liked}
          activeColor="var(--color-like)"
          label="Like"
        >
          <Heart
            className={`w-[18px] h-[18px] transition-transform ${liked ? "fill-current" : ""} ${animate ? "heart-pop" : ""}`}
          />
        </ActionButton>
        <ActionButton onClick={toggleComments} label="Comment">
          <MessageCircle className="w-[18px] h-[18px]" />
        </ActionButton>
        <ActionButton onClick={handleShare} label="Share">
          <Share2 className="w-[18px] h-[18px]" />
        </ActionButton>
        <ActionButton onClick={handleBookmark} active={bookmarked} activeColor="var(--color-primary)" label="Save">
          <Bookmark className={`w-[18px] h-[18px] ${bookmarked ? "fill-current" : ""}`} />
        </ActionButton>
      </div>

      {/* Comment composer — perfectly aligned row */}
      <div className="mt-3 flex items-center gap-2">
        <span className="flex-shrink-0 inline-flex items-center">
          <Avatar src={user?.profilepic} name={`${user?.firstname || ""}`} size={36} />
        </span>
        <div className="flex-1 relative flex items-center">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
            placeholder="Write a comment…"
            className="input rounded-full text-sm h-10 py-0 pl-4 pr-12 w-full"
          />
          <button
            onClick={handleComment}
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
      {showComments && (
        <div className="mt-4 space-y-3 animate-fade-in">
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Be the first to comment</p>
          ) : (
            comments.map((c) => (
              <div key={c._id} className="flex gap-2.5">
                <Avatar src={c.author?.profilepic} name={c.author?.firstname || ""} size={32} />
                <div className="flex-1">
                  <div className="bg-glass-hover rounded-2xl rounded-tl-sm px-3.5 py-2">
                    <p className="text-xs font-bold text-foreground">
                      {c.author?.firstname} {c.author?.lastname}
                    </p>
                    <p className="text-sm text-foreground">{c.text}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 ml-3">{formatTime(c.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </article>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-glass-hover ${
        danger ? "text-error" : "text-foreground"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function ActionButton({ children, onClick, active, activeColor, label }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-glass-hover hover:text-foreground transition-all hover:scale-[1.03]"
      style={active ? { color: activeColor } : undefined}
      aria-label={label}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
