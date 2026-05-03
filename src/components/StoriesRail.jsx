import React from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import Avatar from "./Avatar.jsx";

/**
 * StoriesRail — horizontally scrollable story circles with gradient ring.
 * Visual-only for now (no backend) — gives the feed an instant "social app" feel.
 */
export default function StoriesRail() {
  const { user } = useSelector((s) => s.userReducer);

  // Static placeholder story authors — replace with real stories endpoint when available
  const stories = [
    { id: "s1", name: "Aria", color: "#8b7cff" },
    { id: "s2", name: "Leo", color: "#22d3ee" },
    { id: "s3", name: "Mei", color: "#f472b6" },
    { id: "s4", name: "Kai", color: "#fbbf24" },
    { id: "s5", name: "Noor", color: "#4ade80" },
    { id: "s6", name: "Zane", color: "#f87171" },
    { id: "s7", name: "Iris", color: "#a193ff" },
  ];

  return (
    <div className="card p-3 mt-4 animate-fade-in">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {/* Your story */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <Avatar src={user?.profilepic} name={user?.firstname || ""} size={56} />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 grid place-items-center rounded-full bg-gradient-primary border-2 border-background">
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">Your story</span>
        </div>

        {stories.map((s) => (
          <button
            key={s.id}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
          >
            <span
              className="p-[2px] rounded-full bg-gradient-accent transition-transform group-hover:scale-110"
              style={{ backgroundImage: `conic-gradient(from 180deg, ${s.color}, #8b7cff, #22d3ee, ${s.color})` }}
            >
              <span className="block p-[2px] rounded-full bg-background">
                <Avatar name={s.name} size={52} />
              </span>
            </span>
            <span className="text-[10px] text-foreground-soft font-medium">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
