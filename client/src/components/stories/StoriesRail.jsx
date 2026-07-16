import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import Avatar from "../Avatar.jsx";
import StoryUploader from "./StoryUploader.jsx";
import StoryViewer from "./StoryViewer.jsx";
import { getStories, getMyStories } from "../../apiCalls/users.js";

export default function StoriesRail() {
  const { user } = useSelector((s) => s.userReducer);
  const [followGroups, setFollowGroups] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [viewer, setViewer] = useState(null);

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
    <div className="brutal-card p-3 mt-4 animate-fade-in">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
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
          <p className="text-xs self-center px-3 whitespace-nowrap" style={{ color: "var(--muted-2)" }}>
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
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="relative">
        <button
          onClick={hasStory ? onOpen : onAdd}
          className="block focus:outline-none rounded-full"
          aria-label={hasStory ? "View your story" : "Add story"}
        >
          <Avatar src={user?.profilepic} name={name} size={56} />
        </button>
        {!hasStory && (
          <button
            onClick={onAdd}
            className="absolute -bottom-1 -right-1 w-6 h-6 grid place-items-center rounded-full hover:scale-110 transition-transform"
            style={{ background: "var(--acid)", border: "2px solid var(--ink)", boxShadow: "2px 2px 0 0 var(--ink)" }}
            aria-label="Add story"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} style={{ color: "var(--ink)" }} />
          </button>
        )}
      </div>
      <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>
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
      className="flex flex-col items-center gap-1 flex-shrink-0 group focus:outline-none"
    >
      <span
        className="p-[2px] rounded-full transition-transform group-hover:scale-105"
        style={{ background: hasUnseen ? "var(--acid)" : "var(--paper-2)", border: "2px solid var(--ink)" }}
      >
        <span className="block p-[2px] rounded-full" style={{ background: "var(--paper)" }}>
          <Avatar src={u.profilepic} name={name} size={50} />
        </span>
      </span>
      <span className="font-mono text-[10px] uppercase tracking-widest truncate max-w-[64px]" style={{ color: "var(--muted-2)" }}>
        {name.split(" ")[0] || "User"}
      </span>
    </button>
  );
}

function StoryTileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="skeleton" style={{ width: 56, height: 56 }} />
      <div className="skeleton" style={{ width: 40, height: 10 }} />
    </div>
  );
}