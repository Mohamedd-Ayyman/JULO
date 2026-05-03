import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "../../components/appLayout.jsx";
import Avatar from "../../components/Avatar.jsx";
import { getLoggedUser, getUserById } from "../../apiCalls/users.js";
import { getUserPosts } from "../../apiCalls/post.js";
import {
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  getFollowStatus,
} from "../../apiCalls/follow.js";
import { createOrFindChat } from "../../apiCalls/message.js";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  UserPlus,
  UserMinus,
  Calendar,
  MapPin,
  LinkIcon,
  Settings,
  Grid3X3,
  Bookmark,
  Users,
  Share2,
} from "lucide-react";
import { ROUTES } from "../../lib/constants.js";
import PostCard from "../feed/PostCard.jsx";
import { ProfileSkeleton, PostSkeleton } from "../../components/Skeletons.jsx";
import { EmptyProfilePostsState } from "../../components/EmptyStates.jsx";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { userId: rawUserId } = useParams();
  const { user } = useSelector((s) => s.userReducer);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [tab, setTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const normalizedUserId =
    rawUserId && rawUserId !== "undefined" && rawUserId !== "null"
      ? rawUserId
      : null;
  const targetId = normalizedUserId || user?._id;
  const isOwnProfile = !normalizedUserId || normalizedUserId === user?._id;

  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [profileRes, postsRes, followersRes, followingRes] =
        await Promise.all([
          isOwnProfile ? getLoggedUser() : getUserById(targetId),
          getUserPosts(targetId),
          getFollowers(targetId),
          getFollowing(targetId),
        ]);
      if (cancelled) return;
      if (profileRes.success) setProfile(profileRes.data);
      if (postsRes.success) setPosts(postsRes.data || []);
      if (followersRes.success) setFollowers(followersRes.data || []);
      if (followingRes.success) setFollowing(followingRes.data || []);
      if (!isOwnProfile) {
        const statusRes = await getFollowStatus(targetId);
        if (!cancelled && statusRes.success)
          setIsFollowing(statusRes.data.isFollowing);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [targetId, isOwnProfile]);

  const toggleFollow = async () => {
    if (!targetId || isOwnProfile) return;
    setFollowLoading(true);
    setIsFollowing((v) => !v);
    const res = isFollowing
      ? await unfollowUser(targetId)
      : await followUser(targetId);
    if (!res.success) setIsFollowing((v) => !v);
    else if (isFollowing) {
      setFollowers((prev) => prev.filter((f) => f._id !== user?._id));
    } else if (user) {
      setFollowers((prev) => [{ ...user }, ...prev]);
    }
    setFollowLoading(false);
  };

  const startChat = async () => {
    if (!targetId) return;
    const res = await createOrFindChat(targetId);
    if (res.success) navigate(ROUTES.CHAT_ID(res.data._id));
    else toast.error("Couldn't open chat");
  };

  if (loading) {
    return (
      <AppLayout title="Profile">
        <div className="max-w-2xl mx-auto">
          <ProfileSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout title="Profile">
        <div className="max-w-2xl mx-auto p-6 text-center text-muted-foreground">
          User not found.
        </div>
      </AppLayout>
    );
  }

  const fullName =
    `${profile.firstname || ""} ${profile.lastname || ""}`.trim();

  return (
    <AppLayout title="Profile">
      <div className="max-w-2xl mx-auto pb-6">
        {/* Cover */}
        <div className="relative h-48 sm:h-60 overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-primary opacity-70 animate-gradient"
            style={{ backgroundSize: "200% 200%" }}
          />
          <div className="absolute inset-0 bg-gradient-mesh" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-accent/30 blur-3xl" />
        </div>

        {/* Identity */}
        <div className="px-4 sm:px-6 -mt-12 relative z-10">
          <div className="flex items-end justify-between gap-3 mb-4">
            <span className="rounded-full p-1 bg-background">
              <Avatar src={profile.profilepic} name={fullName} size={96} />
            </span>
            <div className="flex gap-2 pb-1">
              {isOwnProfile ? (
                <Link to={ROUTES.SETTINGS} className="btn btn-glass">
                  <Settings className="w-4 h-4" /> Edit profile
                </Link>
              ) : (
                <>
                  <button onClick={startChat} className="btn btn-glass">
                    <MessageCircle className="w-4 h-4" /> Message
                  </button>
                  <button
                    onClick={toggleFollow}
                    disabled={followLoading}
                    className={
                      isFollowing ? "btn btn-glass" : "btn btn-primary"
                    }
                  >
                    {isFollowing ? (
                      <UserMinus className="w-4 h-4" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            {fullName}
          </h1>
          {profile.bio ? null : <div className="h-1" />}

          {profile.bio && (
            <p className="text-sm text-foreground-soft mt-3 leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-3">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {profile.location}
              </span>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary story-link"
              >
                <LinkIcon className="w-3 h-3" />{" "}
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {profile.createdAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Joined{" "}
                {new Date(profile.createdAt).toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            <Stat
              label="Posts"
              value={
                posts.length -
                posts.filter((p) => p.isRepost || p.originalPost).length
              }
              onClick={() => setTab("posts")}
              active={tab === "posts"}
            />
            <Stat
              label="Reposts"
              value={posts.filter((p) => p.isRepost || p.originalPost).length}
              onClick={() => setTab("reposts")}
              active={tab === "reposts"}
            />
            <Stat
              label="Followers"
              value={followers.length}
              onClick={() => setTab("followers")}
              active={tab === "followers"}
            />
            <Stat
              label="Following"
              value={following.length}
              onClick={() => setTab("following")}
              active={tab === "following"}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 mt-6">
          <div className="flex gap-1 p-1 bg-glass rounded-full">
            {[
              { id: "posts", label: "Posts", icon: Grid3X3 },
              { id: "reposts", label: "Reposts", icon: Grid3X3 },
              { id: "followers", label: "Followers", icon: Users },
              { id: "following", label: "Following", icon: UserPlus },
              ...(isOwnProfile
                ? [{ id: "saved", label: "Saved", icon: Bookmark }]
                : []),
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  tab === t.id
                    ? "bg-gradient-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-6 mt-4 space-y-3 animate-fade-in">
          {tab === "posts" &&
            (posts.filter((p) => !p.isRepost && !p.originalPost).length ===
            0 ? (
              <EmptyProfilePostsState />
            ) : (
              posts
                .filter((p) => !p.isRepost && !p.originalPost)
                .map((p, i) => (
                  <PostCard
                    key={p._id}
                    post={p}
                    index={i}
                    currentUserId={user?._id}
                  />
                ))
            ))}
          {tab === "reposts" &&
            (posts.filter((p) => p.isRepost || p.originalPost).length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">
                No reposts yet.
              </p>
            ) : (
              posts
                .filter((p) => p.isRepost || p.originalPost)
                .map((p, i) => (
                  <div key={p._id} className="relative">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5 pl-1">
                      <Share2 className="w-3 h-3" />
                      <span>{fullName} reposted</span>
                    </div>
                    <PostCard
                      post={p.originalPost || p}
                      index={i}
                      currentUserId={user?._id}
                    />
                  </div>
                ))
            ))}
          {(tab === "followers" || tab === "following") && (
            <UserList list={tab === "followers" ? followers : following} />
          )}
          {tab === "saved" && (
            <p className="text-center text-muted-foreground py-12 text-sm">
              Your bookmarked posts will appear here.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`card p-3 text-left transition-all hover-lift ${
        active ? "border-glass-border-strong glow-primary-soft" : ""
      }`}
    >
      <p className="text-xl font-extrabold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </button>
  );
}

function UserList({ list }) {
  if (!list || list.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12 text-sm">
        Nothing here yet.
      </p>
    );
  }
  return (
    <div className="space-y-2 stagger">
      {list.map((u) => (
        <Link
          key={u._id}
          to={ROUTES.PROFILE_USER(u._id)}
          className="card card-interactive p-3 flex items-center gap-3"
        >
          <Avatar
            src={u.profilepic}
            name={`${u.firstname || ""} ${u.lastname || ""}`}
            size={42}
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {u.firstname} {u.lastname}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {u.bio || ""}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
