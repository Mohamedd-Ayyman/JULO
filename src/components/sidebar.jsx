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
    <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 flex-col bg-glass border-r border-glass-border p-4">
      <div className="text-xl font-bold text-primary mb-8 px-3">JULO</div>
      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${
              location.pathname === to
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-glass-hover"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium text-sm">{label}</span>
          </Link>
        ))}
      </nav>
      <button
        onClick={() => dispatch(logout())}
        className="flex items-center space-x-3 px-3 py-3 rounded-xl text-muted-foreground hover:bg-glass-hover transition-colors w-full"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium text-sm">Logout</span>
      </button>
    </aside>
  );
}
