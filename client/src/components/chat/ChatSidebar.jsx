import React, { useRef, useEffect, useState } from "react";
import { Search, RefreshCw, Plus, Pencil } from "lucide-react";
import ChatListItem from "./ChatListItem.jsx";
import ChatFilterBar from "./ChatFilterBar.jsx";
import { ChatListSkeleton } from "../Skeletons.jsx";
import { EmptyChatsState } from "../EmptyStates.jsx";

export default function ChatSidebar({
  chats,
  activeChat,
  currentUserId,
  loadingChats,
  chatError,
  searchInput,
  search,
  activeFilter,
  typingChats,
  mutedChats,
  pinnedChats,
  onSearchInput,
  onFilterChange,
  onSelectChat,
  onCreateGroup,
  onRetryLoad,
  onToggleMute,
  onTogglePin,
  onArchive,
  onOpenGroupInfo,
  onNewMessage,
  className,
  style,
}) {
  const filteredChats = chats.filter((c) => {
    if (activeFilter === "unread") return (c.unreadMessageCount || 0) > 0;
    return true;
  });

  const unreadCount = chats.filter((c) => (c.unreadMessageCount || 0) > 0).length;
  const searchTimerRef = useRef(null);

  const handleSearchInput = (value) => {
    onSearchInput(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      /* debounce handled by parent */
    }, 300);
  };

  return (
    <aside
      className={`flex-col border-r z-10 flex-shrink-0 ${className || ""}`}
      style={{ borderColor: "var(--line-soft)", background: "var(--paper-2)", ...style }}
    >
      <div className="p-4" style={{ borderBottom: "1px solid var(--line-soft)" }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-xl font-black tracking-tight" style={{ color: "var(--ink)" }}>Messages</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewMessage}
              className="brutal-btn brutal-btn-outline brutal-btn-icon"
              aria-label="New message"
              title="New message"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onCreateGroup}
              className="brutal-btn brutal-btn-primary brutal-btn-icon"
              aria-label="Create group chat"
              title="New group chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted-2)" }} />
          <input
            value={searchInput}
            onChange={(e) => onSearchInput(e.target.value)}
            placeholder="Search conversations…"
            className="brutal-input pl-11 text-sm"
            style={{ paddingTop: 10, paddingBottom: 10 }}
          />
        </div>
        <div className="mt-3">
          <ChatFilterBar
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
            unreadCount={unreadCount}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loadingChats ? (
          <div className="p-2"><ChatListSkeleton /></div>
        ) : chatError ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm mb-3" style={{ color: "var(--riso-red)" }}>{chatError}</p>
            <button
              onClick={onRetryLoad}
              className="brutal-btn brutal-btn-sm"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Retry
            </button>
          </div>
        ) : filteredChats.length === 0 && search.trim() ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Search className="w-8 h-8 mb-3" style={{ color: "var(--muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>No results for "{searchInput}"</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-2)" }}>Try a different search</p>
          </div>
        ) : filteredChats.length === 0 && activeFilter === "unread" ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>All caught up</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-2)" }}>No unread conversations</p>
          </div>
        ) : filteredChats.length === 0 && activeFilter === "archived" ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>No archived conversations</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-2)" }}>Archive chats to see them here</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-4"><EmptyChatsState /></div>
        ) : (
          <>
            {(search.trim() || activeFilter !== "all") && (
              <div className="px-3 py-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>
                  {filteredChats.length} conversation{filteredChats.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            <div className="space-y-1 stagger">
              {filteredChats.map((c) => (
                <ChatListItem
                  key={c._id}
                  chat={c}
                  currentUserId={currentUserId}
                  isActive={c._id === activeChat?._id}
                  isTyping={!!typingChats[c._id]}
                  isMuted={mutedChats.includes(c._id)}
                  isPinned={pinnedChats.includes(c._id)}
                  onClick={() => onSelectChat(c._id)}
                  onToggleMute={onToggleMute}
                  onTogglePin={onTogglePin}
                  onArchive={onArchive}
                  onOpenGroupInfo={onOpenGroupInfo}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
