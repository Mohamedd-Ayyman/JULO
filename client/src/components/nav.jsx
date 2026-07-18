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
import { selectTotalUnreadMessages } from "../redux/chatSlice.js";
import Logo from "./Logo.jsx";
import Avatar from "./Avatar.jsx";

const navItems = [
  { to: ROUTES.HOME, icon: Home, label: "Home" },
  { to: ROUTES.FEED, icon: Sparkles, label: "Feed" },
  { to: ROUTES.EXPLORE, icon: Compass, label: "Explore" },
  { to: ROUTES.CHAT, icon: MessageCircle, label: "Messages" },
  { to: ROUTES.NOTIFICATIONS, icon: Bell, label: "Alerts" },
  { to: ROUTES.PROFILE, icon: User, label: "Profile" },
];

/* ─── Desktop "masthead" sidebar ───────────────────────────────────────── */
export function Sidebar() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.userReducer);
  const { unreadCount } = useSelector((s) => s.notificationReducer);
  const totalUnread = useSelector(selectTotalUnreadMessages);

  const handleLogout = () => {
    dispatch(logout());
    navigate(ROUTES.LOGIN);
  };

  return (
    <aside
      className="hidden lg:flex fixed top-0 left-0 h-screen w-[260px] flex-col p-5 z-30"
      style={{
        background: "var(--paper)",
        borderRight: "1px solid var(--line-soft)",
      }}
    >
      <Link to={ROUTES.HOME} className="block mb-6">
        <Logo size={34} />
      </Link>

      <nav className="flex-1 space-y-0.5 stagger">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-3 px-2 py-2.5 transition-all relative"
              style={{
                color: "var(--ink)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {active && (
                <span className="w-[3px] h-5 bg-accent rounded-full absolute left-0" />
              )}
              <Icon className="w-4 h-4" strokeWidth={active ? 2.6 : 2} />
              <span className="text-[15px]">
                {label}
              </span>
              {label === "Alerts" && unreadCount > 0 && (
                <span
                  className="ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5"
                  style={{
                    background: "var(--riso-red)",
                    color: "var(--paper)",
                    borderRadius: "var(--r-pill)",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {label === "Messages" && totalUnread > 0 && (
                <span
                  className="ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5"
                  style={{
                    background: "var(--riso-red)",
                    color: "var(--paper)",
                    borderRadius: "var(--r-pill)",
                  }}
                >
                  {totalUnread > 99 ? "99+" : totalUnread > 9 ? "9+" : totalUnread}
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
        className="p-3 flex items-center gap-3"
        style={{ background: "var(--paper-2)", borderRadius: "var(--r-md)" }}
      >
        <Link to={ROUTES.PROFILE} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar
            src={user?.profilepic}
            name={`${user?.firstname || ""} ${user?.lastname || ""}`}
            size={38}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              {user?.firstname} {user?.lastname}
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
  const totalUnread = useSelector(selectTotalUnreadMessages);
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
              style={{ color: active ? "var(--accent)" : "var(--ink)" }}
            >
              <Icon
                className="w-5 h-5"
                strokeWidth={active ? 2.6 : 2}
                style={active ? { transform: "translateY(-2px)" } : undefined}
              />
              {label === "Chat" && totalUnread > 0 && (
                <span
                  className="absolute top-0.5 right-1/2 translate-x-3 font-mono text-[8px] font-bold px-1 py-px"
                  style={{
                    background: "var(--riso-red)",
                    color: "var(--paper)",
                    borderRadius: "var(--r-pill)",
                    lineHeight: "14px",
                  }}
                >
                  {totalUnread > 99 ? "99+" : totalUnread > 9 ? "9+" : totalUnread}
                </span>
              )}
              <span
                className="text-[10px] font-sans"
                style={{ opacity: active ? 1 : 0.6 }}
              >
                {label}
              </span>
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

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header
      className="lg:hidden sticky top-0 z-30 backdrop-blur-safe"
      style={{ background: "var(--glass-bg, var(--paper))", borderBottom: "1px solid var(--line-soft)" }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        <Link to={ROUTES.HOME} className="flex items-center gap-2">
          <Logo size={26} withText={!title} />
          {title && (
            <>
              <span className="w-px h-5" style={{ background: "var(--line-soft)" }} />
              <span className="font-display font-semibold text-base tracking-tight">{title}</span>
            </>
          )}
        </Link>
        <div className="flex items-center gap-1.5" ref={ref}>
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
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search Julo..."
                className="brutal-input pl-11"
              />
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
