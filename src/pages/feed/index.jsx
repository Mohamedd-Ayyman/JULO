import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import AppLayout from "../../components/appLayout.jsx";
import { getFeed } from "../../apiCalls/post.js";
import PostCard from "./PostCard.jsx";
import CreatePost from "./CreatePost.jsx";
import { Sparkles } from "lucide-react";
import PostDetailModal from "../postDetail/PostDetailModal.jsx";
import { PostSkeleton } from "../../components/Skeletons.jsx";
import { EmptyFeedState } from "../../components/EmptyStates.jsx";
import StoriesRail from "../../components/StoriesRail.jsx";

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("for-you");
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
    return () => { cancelled = true; };
  }, []);

  return (
    <AppLayout title="Feed">
      <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 sm:py-6">
        {/* Heading */}
        <div className="hidden lg:flex items-center justify-between mb-5 animate-fade-in-down">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: "var(--ink)" }}>
              <Sparkles className="w-6 h-6" style={{ color: "var(--ink)" }} />
              Your Feed
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted-2)" }}>Latest from people you follow</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-full mb-4 animate-fade-in" style={{ background: "var(--paper-2)", border: "1px solid var(--line-soft)" }}>
          {[
            { id: "for-you", label: "For you" },
            { id: "following", label: "Following" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 px-3 rounded-full text-sm font-semibold transition-all"
              style={tab === t.id
                ? { background: "var(--acid)", color: "var(--ink)" }
                : { color: "var(--muted-2)" }
              }
            >
              {t.label}
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
          ) : posts.length === 0 ? (
            <EmptyFeedState />
          ) : (
            posts.map((post, i) => (
              <PostCard
                key={post._id}
                post={post}
                index={i}
                currentUserId={user?._id}
                onShare={(sp) => {
                  const originalId = sp.originalPost?._id || sp.originalPost;
                  setPosts((prev) => {
                    const updated = prev.map((p) => {
                      if (String(p._id) === String(originalId)) {
                        return { ...p, shareCount: (p.shareCount || 0) + 1 };
                      }
                      return p;
                    });
                    return [sp, ...updated];
                  });
                }}
                onUnshare={(repostId) => {
                  setPosts((prev) => {
                    const repost = prev.find((p) => String(p._id) === String(repostId));
                    const originalId = repost?.originalPost?._id || repost?.originalPost;
                    return prev
                      .filter((p) => String(p._id) !== String(repostId))
                      .map((p) => {
                        if (originalId && String(p._id) === String(originalId)) {
                          return { ...p, shareCount: Math.max(0, (p.shareCount || 0) - 1) };
                        }
                        return p;
                      });
                  });
                }}
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
