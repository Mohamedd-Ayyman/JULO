import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
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
import Logo from "./Logo.jsx";
import Avatar from "./Avatar.jsx";

const navItems = [
  { to: ROUTES.HOME, n: "01", icon: Home, label: "Home" },
  { to: ROUTES.FEED, n: "02", icon: Sparkles, label: "Feed" },
  { to: ROUTES.EXPLORE, n: "03", icon: Compass, label: "Explore" },
  { to: ROUTES.CHAT, n: "04", icon: MessageCircle, label: "Messages" },
  { to: ROUTES.NOTIFICATIONS, n: "05", icon: Bell, label: "Alerts" },
  { to: ROUTES.PROFILE, n: "06", icon: User, label: "Profile" },
];

/* ─── Desktop "masthead" sidebar ───────────────────────────────────────── */
export function Sidebar() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.userReducer);
  const { unreadCount } = useSelector((s) => s.notificationReducer);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleLogout = () => {
    dispatch(logout());
    navigate(ROUTES.LOGIN);
  };

  return (
    <aside
      className="hidden lg:flex fixed top-0 left-0 h-screen w-[260px] flex-col p-5 z-30"
      style={{
        background: "var(--paper)",
        borderRight: "2px solid var(--ink)",
      }}
    >
      <Link to={ROUTES.HOME} className="block mb-1">
        <Logo size={34} />
      </Link>
      <p className="font-mono text-[10px] uppercase tracking-widest mb-6" style={{ color: "var(--muted-2)" }}>
        Issue · {today}
      </p>

      <nav className="flex-1 space-y-0.5 stagger">
        {navItems.map(({ to, n, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-3 px-2 py-2.5 transition-all"
              style={{
                color: "var(--ink)",
                fontWeight: active ? 800 : 500,
              }}
            >
              <span className="font-mono text-[10px] w-5" style={{ color: "var(--muted-2)" }}>{n}</span>
              <Icon className="w-4 h-4" strokeWidth={active ? 2.6 : 2} />
              <span
                className={`text-[15px] ${active ? "highlight-swipe" : ""}`}
                style={{ fontFamily: active ? "var(--font-display)" : "var(--font-sans)", letterSpacing: active ? "-0.01em" : 0 }}
              >
                {label}
              </span>
              {label === "Alerts" && unreadCount > 0 && (
                <span
                  className="ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5"
                  style={{
                    background: "var(--riso-red)",
                    color: "var(--paper)",
                    border: "1.5px solid var(--ink)",
                    borderRadius: "var(--r-pill)",
                  }}
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
        className="brutal-btn brutal-btn-primary w-full mb-3"
      >
        <PlusSquare className="w-4 h-4" />
        New Post
      </Link>

      <div
        className="brutal-card p-3 flex items-center gap-3"
        style={{ background: "var(--paper-2)" }}
      >
        <Link to={ROUTES.PROFILE} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar
            src={user?.profilepic}
            name={`${user?.firstname || ""} ${user?.lastname || ""}`}
            size={38}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate" style={{ fontFamily: "var(--font-display)" }}>
              {user?.firstname} {user?.lastname}
            </p>
            <p className="font-mono text-[10px] truncate uppercase" style={{ color: "var(--muted-2)" }}>
              correspondent
            </p>
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
    { to: ROUTES.PROFILE, icon: User, label: "Me" },
  ];
  return (
    <nav
      className="lg:hidden fixed bottom-3 inset-x-3 z-40 brutal-card"
      style={{ background: "var(--paper)" }}
    >
      <div className="flex justify-around items-center h-14 px-2">
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center gap-0.5 py-1.5 relative"
              style={{ color: "var(--ink)" }}
            >
              <Icon
                className="w-5 h-5"
                strokeWidth={active ? 2.6 : 2}
                style={active ? { transform: "translateY(-2px)" } : undefined}
              />
              <span
                className="font-mono text-[9px] uppercase tracking-wider font-bold"
                style={{ opacity: active ? 1 : 0.6 }}
              >
                {label}
              </span>
              {active && (
                <span
                  className="absolute -bottom-1 w-8 h-1.5"
                  style={{ background: "var(--acid)", border: "1.5px solid var(--ink)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── Top bar (mobile) — masthead ──────────────────────────────────────── */
export function TopBar({ title }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header
      className="lg:hidden sticky top-0 z-30"
      style={{ background: "var(--paper)", borderBottom: "2px solid var(--ink)" }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        <Link to={ROUTES.HOME} className="flex items-center gap-2">
          <Logo size={26} withText={!title} />
          {title && (
            <>
              <span className="w-px h-5" style={{ background: "var(--ink)" }} />
              <span className="font-display font-black text-base tracking-tight">{title}</span>
            </>
          )}
        </Link>
        <div className="flex items-center gap-1.5" ref={ref}>
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider mr-1" style={{ color: "var(--muted-2)" }}>
            {today}
          </span>
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
        <div className="px-4 pb-3 anim-fade-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) navigate(`${ROUTES.EXPLORE}?q=${encodeURIComponent(q.trim())}`);
              setOpen(false);
            }}
          >
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="> search julo…"
                className="brutal-input pl-11"
              />
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
