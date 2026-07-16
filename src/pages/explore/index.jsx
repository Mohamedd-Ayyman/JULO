import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Compass, Users, FileText, X, Flame } from "lucide-react";
import AppLayout from "../../components/appLayout.jsx";
import Avatar from "../../components/Avatar.jsx";
import { searchPosts, getFeed } from "../../apiCalls/post.js";
import { searchUsers } from "../../apiCalls/users.js";
import { followUser, unfollowUser, getFollowStatus } from "../../apiCalls/follow.js";
import PostCard from "../feed/PostCard.jsx";
import toast from "react-hot-toast";
import { useDebouncedSearch } from "../../hooks/use-debounce.js";
import { ROUTES } from "../../lib/constants.js";
import { EmptySearchState } from "../../components/EmptyStates.jsx";
import { PostSkeleton, UserCardSkeleton } from "../../components/Skeletons.jsx";

export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tab, setTab] = useState("all");
  const [followingMap, setFollowingMap] = useState({});
  const { user } = useSelector((s) => s.userReducer);

  const userQuickEchoes = [...trending, ...posts]
    .filter((p) => p.isRepost && !p.isQuote && p.author && String(p.author._id) === String(user?._id))
    .map((p) => p.originalPost?._id || p.originalPost)
    .filter(Boolean);

  const { search } = useDebouncedSearch(async (q) => {
    const [postRes, usersRes] = await Promise.all([searchPosts(q), searchUsers(q)]);
    return { postRes, usersRes };
  });

  // Load trending posts when no search
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getFeed();
      if (!cancelled && res.success) setTrending(res.data || []);
    })();
    return () => { cancelled = true; };
  }, []);

  const performSearch = async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    setParams({ q });
    const result = await search(q.trim());
    setLoading(false);
    if (result?.postRes?.success) setPosts(result.postRes.data || []);
    if (result?.usersRes?.success) {
      const filtered = (result.usersRes.data || []).filter((u) => String(u._id) !== String(user?._id));
      setUsers(filtered);
      await Promise.all(
        filtered.map(async (u) => {
          const status = await getFollowStatus(u._id);
          if (status.success) {
            setFollowingMap((prev) => ({ ...prev, [u._id]: status.data.isFollowing }));
          }
        })
      );
    }
  };

  // Auto-search if query in URL
  useEffect(() => {
    if (initialQ) performSearch(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFollowToggle = async (userId) => {
    const isFollowing = followingMap[userId];
    setFollowingMap((p) => ({ ...p, [userId]: !isFollowing }));
    const res = isFollowing ? await unfollowUser(userId) : await followUser(userId);
    if (!res.success) {
      setFollowingMap((p) => ({ ...p, [userId]: isFollowing }));
      toast.error(res.message || "Action failed");
    } else {
      toast.success(isFollowing ? "Unfollowed" : "Following");
    }
  };

  const clear = () => {
    setQuery("");
    setSearched(false);
    setPosts([]);
    setUsers([]);
    setParams({});
  };

  const showResults = searched;

  return (
    <AppLayout title="Explore">
      <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 sm:py-6">
        <div className="hidden lg:block mb-5 animate-fade-in-down">
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: "var(--ink)" }}>
            <Compass className="w-6 h-6" style={{ color: "var(--ink)" }} />
            Explore
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-2)" }}>Discover people, posts and ideas</p>
        </div>

        {/* Search */}
        <form
          onSubmit={(e) => { e.preventDefault(); performSearch(query); }}
          className="relative mb-4 animate-fade-in"
        >
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--muted-2)" }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts and people…"
            className="brutal-input pl-12 pr-20 py-3 rounded-full text-base"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-20 top-1/2 -translate-y-1/2 brutal-btn brutal-btn-ghost brutal-btn-icon"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 brutal-btn brutal-btn-primary px-4 py-1.5"
          >
            {loading ? <div className="spinner" /> : "Search"}
          </button>
        </form>

        {/* Tabs */}
        {showResults && (
          <div className="flex gap-1 p-1 rounded-full mb-4 animate-fade-in" style={{ background: "var(--paper-2)", border: "1px solid var(--line-soft)" }}>
            {[
              { id: "all", label: "Top", icon: Flame },
              { id: "people", label: `People${users.length ? ` (${users.length})` : ""}`, icon: Users },
              { id: "posts", label: `Posts${posts.length ? ` (${posts.length})` : ""}`, icon: FileText },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all"
                style={tab === t.id
                  ? { background: "var(--acid)", color: "var(--ink)" }
                  : { color: "var(--muted-2)" }
                }
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            <UserCardSkeleton />
            <UserCardSkeleton />
            <PostSkeleton />
          </div>
        ) : showResults ? (
          posts.length === 0 && users.length === 0 ? (
            <EmptySearchState query={query} />
          ) : (
            <div className="space-y-5 animate-fade-in">
              {(tab === "all" || tab === "people") && users.length > 0 && (
                <section>
                    {tab === "all" && (
                      <h3
                        className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                        style={{ color: "var(--muted-2)" }}
                      >
                        <Users className="w-3.5 h-3.5" /> People
                      </h3>
                    )}
                    <div className="space-y-2 stagger">
                      {users.map((u) => (
                        <Link
                          key={u._id}
                          to={ROUTES.PROFILE_USER(u._id)}
                          className="brutal-card p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar src={u.profilepic} name={`${u.firstname || ""} ${u.lastname || ""}`} size={42} ring online={u.isOnline} />
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{u.firstname} {u.lastname}</p>
                              <p className="text-xs truncate" style={{ color: "var(--muted-2)" }}>{u.bio || ""}</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.preventDefault(); handleFollowToggle(u._id); }}
                            className="text-xs font-bold px-3.5 py-1.5 rounded-full transition-all flex-shrink-0"
                            style={followingMap[u._id]
                              ? { background: "var(--paper-2)", color: "var(--ink)", border: "2px solid var(--ink)" }
                              : { background: "var(--acid)", color: "var(--ink)", border: "2px solid var(--ink)" }
                            }
                          >
                            {followingMap[u._id] ? "Following" : "Follow"}
                          </button>
                        </Link>
                      ))}
                    </div>
                  </section>
              )}

              {(tab === "all" || tab === "posts") && posts.length > 0 && (
                <section>
                  {tab === "all" && (
                    <h3
                      className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                      style={{ color: "var(--muted-2)" }}
                    >
                      <FileText className="w-3.5 h-3.5" /> Posts
                    </h3>
                  )}
                  <div className="space-y-4">
                    {posts.map((p, i) => (
                      <PostCard
                        key={p._id}
                        post={p}
                        index={i}
                        currentUserId={user?._id}
                        userQuickEchoes={userQuickEchoes}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )
        ) : (
          null
        )}
      </div>
    </AppLayout>
  );
}
