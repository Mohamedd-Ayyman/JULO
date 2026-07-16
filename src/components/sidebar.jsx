import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusSquare, Heart, User, Settings, LogOut } from "lucide-react";
import { ROUTES } from "../lib/constants.js";
import { useDispatch } from "react-redux";
import { logout } from "../redux/usersSlice.js";

const navItems = [
  { to: ROUTES.HOME, icon: Home, label: "Home" },
  { to: ROUTES.EXPLORE, icon: Search, label: "Explore" },
  { to: ROUTES.FEED, icon: PlusSquare, label: "Feed" },
  { to: ROUTES.NOTIFICATIONS, icon: Heart, label: "Notifications" },
  { to: ROUTES.PROFILE, icon: User, label: "Profile" },
  { to: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const location = useLocation();
  const dispatch = useDispatch();

  return (
    <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 flex-col brutal-card p-4">
      <div className="font-display text-2xl font-black tracking-tight mb-8 px-3">
        ju<span style={{ color: "var(--acid)" }}>l</span>o
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors border-2 font-semibold text-sm ${
              location.pathname === to
                ? "bg-foreground text-background border-foreground"
                : "border-transparent hover:bg-paper-2"
            }`}
            style={location.pathname === to ? { boxShadow: "3px 3px 0 0 var(--acid)" } : {}}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <button
        onClick={() => dispatch(logout())}
        className="flex items-center gap-3 px-3 py-2.5 rounded-md border-2 border-transparent transition-colors font-semibold text-sm w-full"
        style={{ color: "var(--muted-2)" }}
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </button>
    </aside>
  );
}