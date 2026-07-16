import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Compass,
  MessageCircle,
  Bell,
  User,
  Settings,
  LogOut,
  Search,
  PlusSquare,
  Sparkles,
} from "lucide-react";
import { ROUTES } from "../lib/constants.js";
import { logout } from "../redux/usersSlice.js";
import { useDispatch, useSelector } from "react-redux";
import Logo from "./Logo.jsx";
import Avatar from "./Avatar.jsx";

const navItems = [
  { to: ROUTES.HOME, icon: Home, label: "Home" },
  { to: ROUTES.FEED, icon: Sparkles, label: "Feed" },
  { to: ROUTES.EXPLORE, icon: Compass, label: "Explore" },
  { to: ROUTES.CHAT, icon: MessageCircle, label: "Messages" },
  { to: ROUTES.NOTIFICATIONS, icon: Bell, label: "Notifications" },
  { to: ROUTES.PROFILE, icon: User, label: "Profile" },
];

/* ─── Desktop sidebar ──────────────────────────────────────────────────── */
export function Sidebar() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.userReducer);
  const { unreadCount } = useSelector((s) => s.notificationReducer);

  const handleLogout = () => {
    dispatch(logout());
    navigate(ROUTES.LOGIN);
  };

  return (
    <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-[260px] flex-col p-4 z-30 brutal-card mr-4">
      <Link to={ROUTES.HOME} className="px-2 py-3 mb-4 hover-scale inline-block">
        <Logo size={32} />
      </Link>

      <nav className="flex-1 space-y-1 stagger">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all duration-150 border-2 ${
                active
                  ? "bg-foreground text-background border-foreground"
                  : "text-foreground border-transparent hover:bg-paper-2"
              }`}
              style={active ? { boxShadow: "3px 3px 0 0 var(--acid)" } : {}}
            >
              <Icon
                className="w-5 h-5 transition-transform group-hover:scale-110"
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span>{label}</span>
              {label === "Notifications" && unreadCount > 0 && (
                <span
                  className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-acid text-ink font-mono"
                  style={{ boxShadow: "2px 2px 0 0 var(--ink)" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <Link
        to={ROUTES.FEED}
        className="brutal-btn brutal-btn-primary w-full mb-3 mt-2"
      >
        <PlusSquare className="w-4 h-4" />
        Create
      </Link>

      <div className="brutal-card p-3 flex items-center gap-3">
        <Link to={ROUTES.PROFILE} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar src={user?.profilepic} name={`${user?.firstname || ""} ${user?.lastname || ""}`} size={38} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold tracking-tight truncate font-display">
              {user?.firstname} {user?.lastname}
            </p>
            {user?.bio ? (
              <p className="font-mono text-[10px] truncate" style={{ color: "var(--muted-2)" }}>{user.bio}</p>
            ) : null}
          </div>
        </Link>
        <Link to={ROUTES.SETTINGS} className="brutal-btn brutal-btn-ghost brutal-btn-icon" title="Settings">
          <Settings className="w-4 h-4" />
        </Link>
        <button onClick={handleLogout} className="brutal-btn brutal-btn-ghost brutal-btn-icon" title="Log out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

/* ─── Mobile bottom nav ────────────────────────────────────────────────── */
export function MobileNav() {
  const { pathname } = useLocation();
  const items = [
    { to: ROUTES.HOME, icon: Home, label: "Home" },
    { to: ROUTES.EXPLORE, icon: Compass, label: "Explore" },
    { to: ROUTES.FEED, icon: PlusSquare, label: "Post" },
    { to: ROUTES.CHAT, icon: MessageCircle, label: "Chat" },
    { to: ROUTES.PROFILE, icon: User, label: "Profile" },
  ];
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t-2 pb-safe"
      style={{ background: "var(--paper)", borderColor: "var(--ink)" }}
    >
      <div className="flex justify-around items-center h-14 px-2 max-w-lg mx-auto">
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-md transition-all relative"
              style={{ color: active ? "var(--ink)" : "var(--muted-2)" }}
            >
              {active && (
                <span
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5"
                  style={{ background: "var(--acid)", boxShadow: "2px 0 0 0 var(--ink)" }}
                />
              )}
              <Icon
                className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className="font-mono text-[9px] uppercase tracking-widest">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── Top bar (mobile + tablet) ────────────────────────────────────────── */
export function TopBar({ title }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header
      className="lg:hidden sticky top-0 z-30 border-b-2"
      style={{ background: "var(--paper)", borderColor: "var(--ink)" }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        <Link to={ROUTES.HOME}><Logo size={26} /></Link>
        {title && (
          <span className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>
            {title}
          </span>
        )}
        <div className="flex items-center gap-1" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="brutal-btn brutal-btn-ghost brutal-btn-icon"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <Link to={ROUTES.NOTIFICATIONS} className="brutal-btn brutal-btn-ghost brutal-btn-icon">
            <Bell className="w-4 h-4" />
          </Link>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-3 animate-fade-in-down">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) navigate(`${ROUTES.EXPLORE}?q=${encodeURIComponent(q.trim())}`);
              setOpen(false);
            }}
            className="relative"
          >
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "var(--muted-2)" }}
            />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search JULO…"
              className="brutal-input pl-11"
            />
          </form>
        </div>
      )}
    </header>
  );
}
