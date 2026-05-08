import React from "react";
import { MessageSquare, Users, Bell, Search, Sparkles } from "lucide-react";

function Empty({ icon: Icon, title, desc }) {
  return (
    <div className="brutal-card p-10 text-center animate-fade-in-up">
      <div className="relative inline-block mb-4">
        <div
          className="absolute inset-0 rounded-lg blur-xl opacity-40"
          style={{ backgroundColor: "var(--acid)" }}
        />
        <div
          className="relative w-16 h-16 rounded-lg border-2 border-foreground grid place-items-center mx-auto"
          style={{ background: "var(--acid)", boxShadow: "4px 4px 0 0 var(--ink)" }}
        >
          <Icon className="w-7 h-7" strokeWidth={1.6} style={{ color: "var(--ink)" }} />
        </div>
      </div>
      <h3 className="font-display text-lg font-bold tracking-tight mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">{desc}</p>
    </div>
  );
}

export const EmptyFeedState = () => (
  <Empty
    icon={Sparkles}
    title="Your feed is quiet"
    desc="Follow people to see their posts here, or echo something to get started."
  />
);
export const EmptyChatsState = () => (
  <Empty
    icon={MessageSquare}
    title="No conversations yet"
    desc="Visit someone's profile and start a chat to see it here."
  />
);
export const EmptyNotificationsState = () => (
  <Empty
    icon={Bell}
    title="All caught up"
    desc="When someone interacts with you, it'll appear here."
  />
);
export const EmptySearchState = ({ query }) => (
  <Empty
    icon={Search}
    title={`No results for "${query}"`}
    desc="Try different keywords or check your spelling."
  />
);
export const EmptyCommentsState = () => (
  <p className="text-center text-muted-foreground text-sm py-6">
    No comments yet. Be the first.
  </p>
);
export const EmptyProfilePostsState = () => (
  <Empty
    icon={Users}
    title="No posts yet"
    desc="When posts are created they'll show up here."
  />
);
