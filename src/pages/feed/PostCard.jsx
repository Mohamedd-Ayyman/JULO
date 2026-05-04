import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { likePost, addComment, getComments, sharePost, bookmarkPost } from "../../apiCalls/post.js";
import {
  Heart,
  MessageCircle,
  Megaphone,
  Send,
  Bookmark,
  MoreHorizontal,
  Quote,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import { ROUTES } from "../../lib/constants.js";
import Avatar from "../../components/Avatar.jsx";
import { formatTime } from "../../components/CommonUI.jsx";
import QuoteEchoModal from "../../components/QuoteEchoModal.jsx";

export default function PostCard({ post, currentUserId, onShare, index = 0 }) {
  const isRepost = !!(post.isRepost || post.originalPost);
  const isQuote = isRepost && post.text && post.text !== post.originalPost?.text;
  const sharer = post.author || null;
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
  const [echoMenuOpen, setEchoMenuOpen] = useState(false);
  const [echoRipple, setEchoRipple] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const echoRef = useRef(null);
  
  const { user } = useSelector((s) => s.userReducer);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (echoRef.current && !echoRef.current.contains(event.target)) {
        setEchoMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleQuickEcho = async () => {
    setEchoMenuOpen(false);
    setEchoRipple(true);
    setTimeout(() => setEchoRipple(false), 1000);
    
    const res = await sharePost(display._id);
    if (res.success) {
      setShareCount((p) => p + 1);
      toast.success("Echoed to your feed");
      onShare?.(res.data);
    } else toast.error(res.message || "Echo failed");
  };

  const handleQuoteEcho = () => {
    setEchoMenuOpen(false);
    setQuoteModalOpen(true);
  };

  const openDetail = () => {
    navigate(ROUTES.POST_DETAIL(display._id), { state: { modal: true } });
  };

  const originalPost = post.originalPost && typeof post.originalPost === "object" ? post.originalPost : null;
  const originalAuthor = originalPost?.author && typeof originalPost.author === "object" ? originalPost.author : null;
  const author = (isRepost && !isQuote && originalAuthor) ? originalAuthor : (post.author || {});
  const authorName = `${author.firstname || ""} ${author.lastname || ""}`.trim();
  const sharerName = sharer ? `${sharer.firstname || ""} ${sharer.lastname || ""}`.trim() : "";
  const sharerIsMe = sharer && currentUserId && String(sharer._id) === String(currentUserId);

  return (
    <>
      {/* Quote Modal - Rendered outside article to avoid clipping */}
      {quoteModalOpen && (
        <QuoteEchoModal 
          post={display} 
          user={user} 
          onClose={() => setQuoteModalOpen(false)} 
          onEchoed={(echo) => {
            setShareCount(prev => prev + 1);
            onShare?.(echo);
          }}
        />
      )}

      <article
        className={`card p-4 sm:p-5 animate-fade-in-up hover-lift relative overflow-hidden ${echoRipple ? "echo-ripple-active" : ""}`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Repost banner */}
        {isRepost && !isQuote && sharer && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Megaphone className="w-3.5 h-3.5" />
            <span>{sharerIsMe ? "You" : sharerName || "Someone"} echoed</span>
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
                {formatTime(isQuote ? post.createdAt : display.createdAt)}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        {isQuote ? (
          <div className="space-y-3">
            <p className="text-foreground text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {post.text}
            </p>
            <div 
              onClick={openDetail}
              className="ml-13 border border-glass-border rounded-xl p-3 hover:bg-glass-hover transition-colors cursor-pointer bg-glass-bg/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <Avatar src={originalAuthor?.profilepic} name={`${originalAuthor?.firstname || ""}`} size={20} />
                <span className="text-xs font-bold text-foreground">{originalAuthor?.firstname} {originalAuthor?.lastname}</span>
                <span className="text-[10px] text-muted-foreground">· {formatTime(originalPost.createdAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{originalPost.text}</p>
              {originalPost.image && (
                <img src={originalPost.image} alt="" className="mt-2 rounded-lg max-h-40 w-full object-cover border border-glass-border" />
              )}
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}

        {/* Stats line */}
        {(likesCount > 0 || display.commentCount > 0 || shareCount > 0) && (
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            {likesCount > 0 && <span>{likesCount} {likesCount === 1 ? "like" : "likes"}</span>}
            {display.commentCount > 0 && <span>{display.commentCount} comments</span>}
            {shareCount > 0 && <span>{shareCount} echoes</span>}
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
          
          {/* Echo Action with Dropdown */}
          <div className="relative flex-1 flex justify-center" ref={echoRef}>
            <ActionButton onClick={() => setEchoMenuOpen(!echoMenuOpen)} label="Echo">
              <Megaphone className={`w-[18px] h-[18px] transition-all ${echoRipple ? "text-primary echo-icon-ping" : ""}`} />
            </ActionButton>            
            {echoMenuOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 card p-1 shadow-2xl animate-scale-in z-50">
                <button 
                  onClick={handleQuickEcho}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-glass-hover text-foreground transition-colors text-left"
                >
                  <Zap className="w-4 h-4 text-warning" />
                  Quick Echo
                </button>
                <button 
                  onClick={handleQuoteEcho}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-glass-hover text-foreground transition-colors text-left"
                >
                  <Quote className="w-4 h-4 text-primary" />
                  Quote Echo
                </button>
              </div>
            )}
          </div>

          <ActionButton onClick={handleBookmark} active={bookmarked} activeColor="var(--color-primary)" label="Save">
            <Bookmark className={`w-[18px] h-[18px] ${bookmarked ? "fill-current" : ""}`} />
          </ActionButton>
        </div>

        {/* Comment input */}
        <div className="mt-3 flex items-center gap-2">
          <span className="flex-shrink-0 flex items-center">
            <Avatar src={user?.profilepic} name={`${user?.firstname || ""}`} size={36} />
          </span>
          <div className="flex-1 relative flex items-center">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
              placeholder="Write a comment…"
              className="input rounded-full pr-11 text-sm h-10 py-0"
            />
            <button
              onClick={handleComment}
              disabled={!comment.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 btn btn-icon btn-primary disabled:opacity-40 flex items-center justify-center"
              style={{ width: 32, height: 32 }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-4 space-y-3 animate-fade-in">
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Be the first to echo back</p>
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

        {/* Visual Ripple Element */}
        <div className="echo-ripple-effect" />
      </article>
    </>
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
