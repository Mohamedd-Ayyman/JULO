import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
import Avatar from "./Avatar.jsx";
import { ROUTES } from "../lib/constants.js";
import { getSuggestions, followUser } from "../apiCalls/follow.js";
import toast from "react-hot-toast";

/**
 * RightRail — Search bar, follow suggestions.
 * Hidden below xl breakpoint.
 */
export default function RightRail() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.userReducer);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getSuggestions(4);
      if (cancelled) return;
      if (res.success) setSuggestions(res.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
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

  return (
    <aside className="hidden xl:block fixed top-0 right-0 h-screen w-[320px] p-4 overflow-y-auto z-20">
      <form onSubmit={submit} className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people, posts…"
          className="input pl-11 rounded-full"
        />
      </form>

      <div className="card p-4 mb-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Suggested for you</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No suggestions right now</p>
        ) : (
          <div className="space-y-3 stagger">
            {suggestions.filter((s) => s._id !== user?._id).map((s) => (
              <div key={s._id} className="flex items-center gap-3">
                <Link to={ROUTES.PROFILE_USER(s._id)} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar src={s.profilepic} name={`${s.firstname || ""} ${s.lastname || ""}`} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate story-link">
                      {s.firstname} {s.lastname}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{s.bio || ""}</p>
                  </div>
                </Link>
                <button
                  onClick={() => handleFollow(s._id)}
                  disabled={followed[s._id]}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                    followed[s._id]
                      ? "bg-glass-hover text-muted-foreground"
                      : "bg-gradient-primary text-white hover:scale-105 glow-primary-soft"
                  }`}
                >
                  {followed[s._id] ? "Following" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground-2 px-2 leading-relaxed">
        © {new Date().getFullYear()} JULO · <span className="story-link">Privacy</span> · <span className="story-link">Terms</span> · <span className="story-link">About</span>
      </div>
    </aside>
  );
}
