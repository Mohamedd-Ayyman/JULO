import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, UserPlus, Loader2, TrendingUp } from "lucide-react";
import { useSelector } from "react-redux";
import Avatar from "./Avatar.jsx";
import { ROUTES } from "../lib/constants.js";
import { getSuggestions, followUser } from "../apiCalls/follow.js";
import toast from "react-hot-toast";
import { MOODS } from "../lib/moods.js";
import Sticker from "./ui-brutal/Sticker.jsx";

/**
 * RightRail — editorial column with Today's mood poll, suggested correspondents, footer.
 */
export default function RightRail() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.userReducer);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState({});
  const [poll, setPoll] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("julo_mood_poll") || "{}");
    } catch {
      return {};
    }
  });
  const [voted, setVoted] = useState(() => localStorage.getItem("julo_mood_vote") || null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getSuggestions(4);
      if (cancelled) return;
      if (res.success) setSuggestions(res.data || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`${ROUTES.EXPLORE}?q=${encodeURIComponent(q.trim())}`);
  };

  const handleFollow = async (id) => {
    setFollowed((p) => ({ ...p, [id]: true }));
    const res = await followUser(id);
    if (!res.success) {
      setFollowed((p) => ({ ...p, [id]: false }));
      toast.error(res.message || "Failed");
    } else {
      toast.success("Following");
    }
  };

  const vote = (moodId) => {
    if (voted) return;
    const next = { ...poll, [moodId]: (poll[moodId] || 0) + 1 };
    setPoll(next);
    setVoted(moodId);
    localStorage.setItem("julo_mood_poll", JSON.stringify(next));
    localStorage.setItem("julo_mood_vote", moodId);
  };

  const totalVotes = Object.values(poll).reduce((a, b) => a + b, 0) || 0;

  return (
    <aside
      className="hidden xl:block fixed top-0 right-0 h-screen w-[320px] p-5 overflow-y-auto z-20"
      style={{ background: "var(--paper)", borderLeft: "2px solid var(--ink)" }}
    >
      <form onSubmit={submit} className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="> search julo…"
          className="brutal-input pl-11"
        />
      </form>

      {/* Today's mood poll */}
      <div className="brutal-card p-4 mb-4 anim-fade-in-up" style={{ background: "var(--paper)" }}>
        <p className="eyebrow mb-1">Today · Vol 1</p>
        <h3 className="font-display font-black text-xl leading-tight mb-3">
          What&apos;s the <em className="not-italic" style={{ background: "var(--acid)", padding: "0 4px" }}>mood</em>?
        </h3>
        <div className="space-y-1.5">
          {MOODS.map((m) => {
            const count = poll[m.id] || 0;
            const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
            const isMine = voted === m.id;
            return (
              <button
                key={m.id}
                onClick={() => vote(m.id)}
                disabled={!!voted}
                className="w-full text-left relative overflow-hidden border-2 transition-all"
                style={{
                  borderColor: "var(--ink)",
                  background: "var(--paper-2)",
                  borderRadius: "var(--r-sm)",
                  cursor: voted ? "default" : "pointer",
                }}
              >
                {voted && (
                  <span
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${pct}%`, background: m.color, opacity: 0.55 }}
                  />
                )}
                <span className="relative flex items-center justify-between px-2.5 py-1.5 font-mono text-[12px] font-bold">
                  <span>
                    <span className="mr-1.5">{m.emoji}</span>
                    {m.label}
                    {isMine && <span className="ml-1.5 text-[10px]" style={{ color: "var(--muted-2)" }}>· you</span>}
                  </span>
                  {voted && <span>{pct}%</span>}
                </span>
              </button>
            );
          })}
        </div>
        {!voted && <p className="font-mono text-[10px] mt-3 uppercase tracking-wider" style={{ color: "var(--muted-2)" }}>Tap to cast your vote</p>}
      </div>

      {/* Correspondents */}
      <div className="brutal-card p-4 mb-4 anim-fade-in-up" style={{ background: "var(--paper)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="eyebrow">New voices</p>
          <Sticker tone="acid" rotate={-3} className="text-[9px]">FRESH</Sticker>
        </div>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : suggestions.length === 0 ? (
          <p className="font-mono text-[11px] text-center py-3" style={{ color: "var(--muted-2)" }}>
            No suggestions right now
          </p>
        ) : (
          <div className="space-y-3 stagger">
            {suggestions.filter((s) => s._id !== user?._id).map((s) => (
              <div key={s._id} className="flex items-center gap-3">
                <Link to={ROUTES.PROFILE_USER(s._id)} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar src={s.profilepic} name={`${s.firstname || ""} ${s.lastname || ""}`} size={38} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ fontFamily: "var(--font-display)" }}>
                      {s.firstname} {s.lastname}
                    </p>
                    <p className="font-mono text-[10px] truncate" style={{ color: "var(--muted-2)" }}>
                      {s.bio || "—"}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => handleFollow(s._id)}
                  disabled={followed[s._id]}
                  className={`brutal-btn brutal-btn-sm ${followed[s._id] ? "" : "brutal-btn-primary"}`}
                >
                  {followed[s._id] ? "✓" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="font-mono text-[10px] uppercase tracking-wider px-2 leading-relaxed" style={{ color: "var(--muted-2)" }}>
        © {new Date().getFullYear()} JULO Press · No paywall · No ads · No drama
      </div>
    </aside>
  );
}
