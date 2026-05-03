import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import AppLayout from "../../components/appLayout.jsx";
import { getFeed } from "../../apiCalls/post.js";
import PostCard from "./PostCard.jsx";
import CreatePost from "./CreatePost.jsx";
import { Loader2, Sparkles, Plus } from "lucide-react";
import PostDetailModal from "../postDetail/PostDetailModal.jsx";
import { PostSkeleton } from "../../components/Skeletons.jsx";
import { EmptyFeedState } from "../../components/EmptyStates.jsx";
import StoriesRail from "../../components/StoriesRail.jsx";

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("for-you");
  const { user } = useSelector((s) => s.userReducer);

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
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Your Feed
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Latest from people you follow</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-glass rounded-full mb-4 animate-fade-in">
          {[
            { id: "for-you", label: "For you" },
            { id: "following", label: "Following" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-3 rounded-full text-sm font-semibold transition-all ${
                tab === t.id
                  ? "bg-gradient-primary text-white glow-primary-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
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
                onShare={(sp) => setPosts((prev) => [sp, ...prev])}
              />
            ))
          )}
        </div>
      </div>
      <PostDetailModal />
    </AppLayout>
  );
}
