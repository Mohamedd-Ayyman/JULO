import React from "react";
import { MessageSquare, Users, Bell, Search, Sparkles } from "lucide-react";

function Empty({ icon: Icon, title, desc, accent = "primary" }) {
  return (
    <div className="card p-10 text-center animate-fade-in-up">
      <div className="relative inline-block mb-4">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-50"
          style={{ backgroundColor: accent === "primary" ? "var(--color-primary)" : "var(--color-accent)" }}
        />
        <div className="relative w-16 h-16 rounded-full bg-glass-strong border border-glass-border-strong grid place-items-center mx-auto animate-float">
          <Icon className="w-7 h-7 text-primary" strokeWidth={1.6} />
        </div>
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">{desc}</p>
    </div>
  );
}

export const EmptyFeedState = () => (
  <Empty icon={Sparkles} title="Your feed is quiet" desc="Follow people to see their posts here, or echo something to get started." />
);
export const EmptyChatsState = () => (
  <Empty icon={MessageSquare} title="No conversations yet" desc="Visit someone's profile and start a chat to see it here." />
);
export const EmptyNotificationsState = () => (
  <Empty icon={Bell} title="All caught up" desc="When someone interacts with you, it'll appear here." />
);
export const EmptySearchState = ({ query }) => (
  <Empty icon={Search} title={`No results for "${query}"`} desc="Try different keywords or check your spelling." />
);
export const EmptyCommentsState = () => (
  <p className="text-center text-muted-foreground text-sm py-6">No comments yet. Be the first.</p>
);
export const EmptyProfilePostsState = () => (
  <Empty icon={Users} title="No posts yet" desc="When posts are created they'll show up here." />
);
