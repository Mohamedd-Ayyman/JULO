import React from "react";
import { MessageSquare, Users, Bell, Search, Sparkles } from "lucide-react";
import Sticker from "./ui-brutal/Sticker.jsx";

function Empty({ icon: Icon, title, desc, badge }) {
  return (
    <div className="brutal-card p-10 text-center anim-fade-in-up relative overflow-hidden" style={{ background: "var(--paper)" }}>
      <span className="absolute -top-3 left-6 tape" />
      <div
        className="w-16 h-16 mx-auto mb-4 grid place-items-center"
        style={{ background: "var(--acid)", border: "2px solid var(--ink)", borderRadius: "var(--r-sm)" }}
      >
        <Icon className="w-7 h-7" strokeWidth={2.4} />
      </div>
      {badge && <Sticker tone="red" rotate={-4} className="mb-3">{badge}</Sticker>}
      <h3 className="font-display font-black text-2xl tracking-tight mb-1.5">{title}</h3>
      <p className="text-sm max-w-xs mx-auto" style={{ color: "var(--muted-2)" }}>{desc}</p>
    </div>
  );
}

export const EmptyFeedState = () => (
  <Empty
    icon={Sparkles}
    title="The press is quiet."
    desc="Follow some correspondents — or file the first dispatch yourself."
    badge="No news yet"
  />
);
export const EmptyChatsState = () => (
  <Empty
    icon={MessageSquare}
    title="Inbox zero."
    desc="Visit a profile and tap Message to start a conversation."
  />
);
export const EmptyNotificationsState = () => (
  <Empty icon={Bell} title="All caught up." desc="When somebody yells your name, it lands here." />
);
export const EmptySearchState = ({ query }) => (
  <Empty icon={Search} title={`Nothing for "${query}"`} desc="Try fewer words or another angle." />
);
export const EmptyCommentsState = () => (
  <p className="font-mono text-xs text-center py-6 uppercase tracking-wider" style={{ color: "var(--muted-2)" }}>
    No replies yet. Be the loud one.
  </p>
);
export const EmptyProfilePostsState = () => (
  <Empty icon={Users} title="No clippings." desc="Posts will be archived here." />
);
