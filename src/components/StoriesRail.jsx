import React from "react";

/**
 * StoriesRail — horizontally scrollable story circles with gradient ring.
 */
export default function StoriesRail() {
  // Static placeholder story authors
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
    <div className="brutal-card p-3 mt-4 animate-fade-in">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {/* Your story */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="relative">
            <div className="brutal-avatar brutal-avatar-online" style={{ width: 56, height: 56 }}>
              ME
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 grid place-items-center rounded-full text-ink font-mono font-bold border-2 border-ink"
              style={{ background: "var(--acid)", fontSize: 12, boxShadow: "2px 2px 0 0 var(--ink)" }}
            >
              +
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Your story</span>
        </div>

        {stories.map((s) => (
          <button
            key={s.id}
            className="flex flex-col items-center gap-1 flex-shrink-0 group"
          >
            <span
              className="p-[2.5px] rounded-full transition-transform group-hover:scale-110"
              style={{
                background: `conic-gradient(from 180deg, ${s.color}, #8b7cff, #22d3ee, ${s.color})`,
              }}
            >
              <span className="block p-[2px] rounded-full bg-background">
                <div
                  className="brutal-avatar"
                  style={{ width: 50, height: 50, fontSize: 13 }}
                >
                  {s.name.slice(0, 2)}
                </div>
              </span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {s.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}