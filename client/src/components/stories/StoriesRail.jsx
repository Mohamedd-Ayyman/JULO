import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import Avatar from "../Avatar.jsx";
import StoryUploader from "./StoryUploader.jsx";
import StoryViewer from "./StoryViewer.jsx";
import { getStories, getMyStories } from "../../apiCalls/users.js";

/**
 * StoriesRail — horizontal list of stories from people you follow + your own.
 * View counts visible only to story owner. Stories vanish after 24h (server).
 */
export default function StoriesRail() {
  const { user } = useSelector((s) => s.userReducer);
  const [followGroups, setFollowGroups] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [viewer, setViewer] = useState(null); // { groupIndex, storyIndex }

  const refresh = useCallback(async () => {
    setLoading(true);
    const [feedRes, mineRes] = await Promise.all([getStories(), getMyStories()]);
    if (feedRes.success) setFollowGroups(feedRes.data || []);
    if (mineRes.success) setMyStories(mineRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Build ordered list: my own group first (if any), then follows (excluding self), unseen first.
  const orderedGroups = useMemo(() => {
    const others = (followGroups || [])
      .filter((g) => String(g.user?._id) !== String(user?._id))
      .slice()
      .sort((a, b) => Number(!!b.hasUnseen) - Number(!!a.hasUnseen));

    if (myStories.length > 0) {
      return [
        {
          _id: "me",
          user,
          stories: myStories,
          hasUnseen: false,
          isMine: true,
        },
        ...others,
      ];
    }
    return others;
  }, [followGroups, myStories, user]);

  const openAt = (groupId) => {
    const idx = orderedGroups.findIndex((g) => g._id === groupId);
    if (idx >= 0) setViewer({ groupIndex: idx, storyIndex: 0 });
  };

  return (
    <div className="card p-3 mt-4 animate-fade-in">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {/* Your story button */}
        <YourStoryTile
          user={user}
          hasStory={myStories.length > 0}
          onAdd={() => setUploaderOpen(true)}
          onOpen={() => openAt("me")}
        />

        {loading
          ? [0, 1, 2, 3].map((i) => <StoryTileSkeleton key={i} />)
          : orderedGroups
              .filter((g) => !g.isMine)
              .map((g) => (
                <StoryTile key={g._id} group={g} onOpen={() => openAt(g._id)} />
              ))}

        {!loading && orderedGroups.filter((g) => !g.isMine).length === 0 && (
          <p className="text-xs text-muted-foreground self-center px-3 whitespace-nowrap">
            Follow people to see their stories
          </p>
        )}
      </div>

      <StoryUploader
        open={uploaderOpen}
        onClose={() => setUploaderOpen(false)}
        onPosted={refresh}
      />

      {viewer && (
        <StoryViewer
          groups={orderedGroups}
          startGroupIndex={viewer.groupIndex}
          startStoryIndex={viewer.storyIndex}
          currentUserId={user?._id}
          onClose={() => setViewer(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function YourStoryTile({ user, hasStory, onAdd, onOpen }) {
  const name = `${user?.firstname || ""} ${user?.lastname || ""}`.trim();
  return (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
      <div className="relative">
        <button
          onClick={hasStory ? onOpen : onAdd}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
          aria-label={hasStory ? "View your story" : "Add story"}
        >
          <Avatar src={user?.profilepic} name={name} size={56} ring={hasStory} />
        </button>
        {!hasStory && (
          <button
            onClick={onAdd}
            className="absolute -bottom-1 -right-1 w-6 h-6 grid place-items-center rounded-full bg-gradient-primary border-2 border-background hover:scale-110 transition-transform shadow-md"
            aria-label="Add story"
          >
            <Plus className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </button>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">
        {hasStory ? "Your story" : "Add story"}
      </span>
    </div>
  );
}

function StoryTile({ group, onOpen }) {
  const u = group.user || {};
  const name = `${u.firstname || ""} ${u.lastname || ""}`.trim();
  const hasUnseen = !!group.hasUnseen;
  return (
    <button
      onClick={onOpen}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
    >
      <span
        className={`p-[2px] rounded-full transition-transform group-hover:scale-105 ${
          hasUnseen ? "bg-gradient-accent" : "bg-glass-border-strong"
        }`}
      >
        <span className="block p-[2px] rounded-full bg-background">
          <Avatar src={u.profilepic} name={name} size={52} />
        </span>
      </span>
      <span className="text-[10px] text-foreground-soft font-medium truncate max-w-[64px]">
        {name.split(" ")[0] || "User"}
      </span>
    </button>
  );
}

function StoryTileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
      <div className="w-14 h-14 rounded-full skeleton" />
      <div className="w-10 h-2.5 rounded skeleton" />
    </div>
  );
}
