import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Julo — Your Mood Feed" },
      {
        name: "description",
        content: "Your mood, your feed. Authentic sharing without the noise.",
      },
    ],
  }),
  component: FeedPage,
});

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOODS = [
  { id: "all", label: "All", icon: "◎", color: "var(--ink)" },
  { id: "hyped", label: "Hyped", icon: "⚡", color: "var(--mood-hyped)" },
  { id: "cozy", label: "Cozy", icon: "☕", color: "var(--mood-cozy)" },
  { id: "salty", label: "Salty", icon: "🌊", color: "var(--mood-salty)" },
  { id: "curious", label: "Curious", icon: "🔮", color: "var(--mood-curious)" },
  { id: "hottake", label: "Hot Take", icon: "🔥", color: "var(--mood-hottake)" },
  { id: "soft", label: "Soft", icon: "🌸", color: "var(--mood-soft)" },
];

const POSTS = [
  {
    id: "1",
    author: "Priya Nair",
    handle: "@priya.n",
    mood: "hyped",
    time: "2m",
    content: "Just found out my side project hit 500 users overnight. Zero marketing. Pure word of mouth. This is the dopamine I've been chasing for months. 🍿",
    replies: 12,
    likes: 47,
    reposts: 3,
    avatar: "PN",
    moodColor: "var(--mood-hyped)",
  },
  {
    id: "2",
    author: "Marcus Webb",
    handle: "@m_webb",
    mood: "cozy",
    time: "15m",
    content: "Rainy Sunday. French press full. A dog asleep on my feet. The world owes me nothing today, and I'm grateful for that.",
    replies: 4,
    likes: 31,
    reposts: 1,
    avatar: "MW",
    moodColor: "var(--mood-cozy)",
  },
  {
    id: "3",
    author: "Sofia Reyes",
    handle: "@sofia_r",
    mood: "salty",
    time: "34m",
    content: "Hot take: Most productivity advice is just anxiety dressed up in a notepad. You don't need another system. You need to do the thing.",
    replies: 28,
    likes: 94,
    reposts: 19,
    avatar: "SR",
    moodColor: "var(--mood-salty)",
  },
  {
    id: "4",
    author: "Jamie Chen",
    handle: "@jamie.c",
    mood: "curious",
    time: "1h",
    content: "Reading about how octopuses have distributed intelligence across their arms. Each arm can \"think\" independently. We really share a planet with beings that make us look so... linear.",
    replies: 7,
    likes: 55,
    reposts: 4,
    avatar: "JC",
    moodColor: "var(--mood-curious)",
  },
  {
    id: "5",
    author: "Devon Blake",
    handle: "@devon.blake",
    mood: "hottake",
    time: "2h",
    content: "Unpopular opinion: the best relationships I've had started as arguments. Real friction surfaces what's actually there.",
    replies: 41,
    likes: 128,
    reposts: 22,
    avatar: "DB",
    moodColor: "var(--mood-hottake)",
  },
  {
    id: "6",
    author: "Aisha Okonkwo",
    handle: "@aishaok",
    mood: "soft",
    time: "3h",
    content: "My grandmother learned to use text messages last month. Sent me her first one today: \"Thinking of you, darling.\" That's the whole thing. Just love in 20 characters.",
    replies: 19,
    likes: 203,
    reposts: 41,
    avatar: "AO",
    moodColor: "var(--mood-soft)",
  },
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function MoodChip({ mood, active, onClick }: { mood: typeof MOODS[0]; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`sticker flex-shrink-0 text-[11px] transition-transform ${active ? "" : "opacity-60 hover:opacity-80"}`}
      style={{
        background: active ? mood.color : "var(--paper)",
        color: active ? "var(--paper)" : "var(--ink)",
        transform: active ? "rotate(0deg)" : `rotate(${-2 + Math.random() * 4 - 2}deg)`,
      }}
    >
      <span>{mood.icon}</span>
      {mood.label}
    </button>
  );
}

function PostCard({ post }: { post: typeof POSTS[0] }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  return (
    <article className="brutal-card p-5 animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div
          className="brutal-avatar flex h-12 w-12 flex-shrink-0 items-center justify-center text-base"
          style={{ fontSize: "13px" }}
        >
          {post.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-display text-base font-bold tracking-tight">{post.author}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{post.handle}</span>
            <span className="font-mono text-[11px] text-muted-foreground">·</span>
            <span className="font-mono text-[11px] text-muted-foreground">{post.time}</span>
          </div>
          <div
            className="sticker mt-1 inline-flex text-[10px]"
            style={{ background: post.moodColor, color: "var(--paper)", fontSize: "10px", padding: "2px 8px" }}
          >
            {MOODS.find((m) => m.id === post.mood)?.icon} {MOODS.find((m) => m.id === post.mood)?.label}
          </div>
        </div>
      </div>

      <p className="mt-3 font-sans text-[15px] leading-relaxed text-foreground">{post.content}</p>

      <div className="mt-4 flex items-center gap-6 border-t border-foreground/15 pt-3">
        <button className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
          <span className="text-base">↑</span>
          <span>{post.replies}</span>
        </button>
        <button
          onClick={() => { setLiked(!liked); setLikeCount(liked ? likeCount - 1 : likeCount + 1); }}
          className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors hover:text-foreground ${liked ? "text-like" : "text-muted-foreground"}`}
        >
          <span className="text-base" style={{ color: liked ? "var(--riso-red)" : "inherit" }}>♥</span>
          <span>{likeCount}</span>
        </button>
        <button className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
          <span className="text-base">↺</span>
          <span>{post.reposts}</span>
        </button>
        <button className="ml-auto font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
          <span>···</span>
        </button>
      </div>
    </article>
  );
}

function ComposeBox() {
  const [text, setText] = useState("");
  const [mood, setMood] = useState("all");
  const [open, setOpen] = useState(false);
  const charCount = text.length;
  const MAX = 280;

  return (
    <div className="brutal-card p-4 animate-fade-in">
      <div className="flex gap-3">
        <div className="brutal-avatar flex h-10 w-10 flex-shrink-0 items-center justify-center text-sm">ME</div>
        <div className="min-w-0 flex-1">
          <textarea
            className="brutal-input w-full resize-none text-[15px]"
            placeholder="What's your mood?"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            onFocus={() => setOpen(true)}
          />
          {open && (
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {MOODS.slice(1).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMood(mood === m.id ? "all" : m.id)}
                    className={`sticker text-[10px] transition-all ${mood === m.id ? "" : "opacity-50"}`}
                    style={{
                      background: mood === m.id ? m.color : "var(--paper-2)",
                      color: mood === m.id ? "var(--paper)" : "var(--ink)",
                    }}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className={`char-counter font-mono text-[11px] ${charCount > MAX * 0.9 ? "over" : charCount > MAX * 0.75 ? "near" : "ok"}`}>
                  {MAX - charCount}
                </span>
                <button
                  className="brutal-btn brutal-btn-primary brutal-btn-sm"
                  disabled={!text.trim()}
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Header() {
  const [activeTab, setActiveTab] = useState<"feed" | "following">("feed");

  return (
    <header className="sticky top-0 z-30 border-b-2 border-foreground bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl font-black tracking-tight">
            ju<span className="text-acid">l</span>o
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="brutal-btn brutal-btn-ghost brutal-btn-icon">
            <span className="font-mono text-base">⌕</span>
          </button>
          <button className="brutal-btn brutal-btn-ghost brutal-btn-icon">
            <span className="font-mono text-base">⚙</span>
          </button>
        </div>
      </div>
      <div className="flex border-t border-foreground/20">
        <button
          onClick={() => setActiveTab("feed")}
          className={`flex-1 py-3 font-mono text-[11px] uppercase tracking-widest transition-colors ${activeTab === "feed" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          Feed
        </button>
        <button
          onClick={() => setActiveTab("following")}
          className={`flex-1 py-3 font-mono text-[11px] uppercase tracking-widest transition-colors ${activeTab === "following" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          Following
        </button>
      </div>
    </header>
  );
}

function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t-2 border-foreground bg-background/95 backdrop-blur-safe">
      <div className="grid grid-cols-4 py-2">
        {[
          { icon: "⌂", label: "Home" },
          { icon: "⌕", label: "Search" },
          { icon: "✎", label: "Compose" },
          { icon: "☺", label: "Profile" },
        ].map(({ icon, label }) => (
          <button key={label} className="flex flex-col items-center gap-0.5 py-1 transition-colors hover:text-primary">
            <span className="font-mono text-xl">{icon}</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

function FeedPage() {
  const [activeMood, setActiveMood] = useState("all");

  const filtered = activeMood === "all" ? POSTS : POSTS.filter((p) => p.mood === activeMood);

  return (
    <div className="relative min-h-screen pb-20">
      <Header />

      <div className="overflow-x-auto border-b border-foreground/15">
        <div className="flex gap-2 px-4 py-3">
          {MOODS.map((mood) => (
            <MoodChip
              key={mood.id}
              mood={mood}
              active={activeMood === mood.id}
              onClick={() => setActiveMood(mood.id)}
            />
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <ComposeBox />
      </div>

      <div className="mt-4 space-y-3 px-4">
        {filtered.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}