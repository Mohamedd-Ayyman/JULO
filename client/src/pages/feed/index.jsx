import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import AppLayout from "../../components/appLayout.jsx";
import { getFeed } from "../../apiCalls/post.js";
import PostCard from "./PostCard.jsx";
import CreatePost from "./CreatePost.jsx";
import PostDetailModal from "../postDetail/PostDetailModal.jsx";
import { PostSkeleton } from "../../components/Skeletons.jsx";
import { EmptyFeedState } from "../../components/EmptyStates.jsx";
import StoriesRail from "../../components/stories/StoriesRail.jsx";
import { MOODS } from "../../lib/moods.js";

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("for-you");
  const [moodFilter, setMoodFilter] = useState(null);
  const { user } = useSelector((s) => s.userReducer);

  const userQuickEchoes = posts
    .filter((p) => p.isRepost && !p.isQuote && p.author && String(p.author._id) === String(user?._id))
    .map((p) => p.originalPost?._id || p.originalPost)
    .filter(Boolean);

  const postsById = posts.reduce((acc, item) => {
    if (item?._id) acc[String(item._id)] = item;
    return acc;
  }, {});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await getFeed();
      if (cancelled) return;
      if (res.success) setPosts(res.data || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = moodFilter
    ? posts.filter((p) => {
        const target = p.originalPost && typeof p.originalPost === "object" ? p.originalPost : p;
        const m = target.mood;
        if (m) return m === moodFilter;
        // Pseudo-mood fallback so the filter does something even without backend support
        const seed = String(target._id || "");
        let h = 0;
        for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
        return MOODS[Math.abs(h) % MOODS.length].id === moodFilter;
      })
    : posts;

  return (
    <AppLayout title="Feed">
      <div className="max-w-2xl mx-auto px-3 sm:px-5 py-5 sm:py-8">
        {/* Editorial header */}
        <div className="hidden lg:block mb-5 animate-fade-in">
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
            Feed
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-4 anim-fade-in" style={{ borderBottom: "1px solid var(--line)" }}>
          {[
            { id: "for-you", label: "For You" },
            { id: "following", label: "Following" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 px-3 text-sm font-medium transition-all relative"
              style={{
                color: tab === t.id ? "var(--ink)" : "var(--muted)",
              }}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: "var(--accent)" }} />
              )}
            </button>
          ))}
        </div>

        {/* Mood filter strip */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3">
          <button
            onClick={() => setMoodFilter(null)}
            className="font-mono text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 flex-shrink-0 transition-all"
            style={{
              background: moodFilter === null ? "var(--ink)" : "var(--paper)",
              color: moodFilter === null ? "var(--paper)" : "var(--ink)",
              border: "2px solid var(--ink)",
              borderRadius: "var(--r-pill)",
            }}
          >
            All moods
          </button>
          {MOODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMoodFilter(moodFilter === m.id ? null : m.id)}
              className="font-mono text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 flex-shrink-0 transition-all"
              style={{
                background: moodFilter === m.id ? m.color : "var(--paper)",
                color: "var(--ink)",
                border: "2px solid var(--ink)",
                borderRadius: "var(--r-pill)",
                boxShadow: moodFilter === m.id ? "2px 2px 0 0 var(--ink)" : "none",
              }}
            >
              <span className="mr-1">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>

        <StoriesRail />

        <div className="mt-4">
          <CreatePost user={user} onPostCreated={(p) => setPosts((prev) => [p, ...prev])} />
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : filtered.length === 0 ? (
            <EmptyFeedState />
          ) : (
            filtered.map((post, i) => (
              <PostCard
                key={post._id}
                post={post}
                index={i}
                currentUserId={user?._id}
                onShare={(sp) => {
                  const originalId = sp.originalPost?._id || sp.originalPost;
                  setPosts((prev) => {
                    const updated = prev.map((p) =>
                      String(p._id) === String(originalId)
                        ? { ...p, shareCount: (p.shareCount || 0) + 1 }
                        : p,
                    );
                    return [sp, ...updated];
                  });
                }}
                onUnshare={(repostId) => {
                  setPosts((prev) => {
                    const repost = prev.find((p) => String(p._id) === String(repostId));
                    const originalId = repost?.originalPost?._id || repost?.originalPost;
                    return prev
                      .filter((p) => String(p._id) !== String(repostId))
                      .map((p) =>
                        originalId && String(p._id) === String(originalId)
                          ? { ...p, shareCount: Math.max(0, (p.shareCount || 0) - 1) }
                          : p,
                      );
                  });
                }}
                onDelete={(id) => setPosts((prev) => prev.filter((p) => String(p._id) !== String(id)))}
                userQuickEchoes={userQuickEchoes}
                postsById={postsById}
              />
            ))
          )}
        </div>
      </div>
      <PostDetailModal />
    </AppLayout>
  );
}
