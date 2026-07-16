import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusSquare, Heart, User } from "lucide-react";
import { ROUTES } from "../lib/constants.js";

const navItems = [
  { to: ROUTES.HOME, icon: Home, label: "Home" },
  { to: ROUTES.EXPLORE, icon: Search, label: "Explore" },
  { to: ROUTES.FEED, icon: PlusSquare, label: "Feed" },
  { to: ROUTES.NOTIFICATIONS, icon: Heart, label: "Notifications" },
  { to: ROUTES.PROFILE, icon: User, label: "Profile" },
];

export default function MobileNav() {
  const { pathname } = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t-2 flex justify-around py-2 z-40 pb-safe" style={{ background: "var(--paper)", borderColor: "var(--ink)" }}>
      {navItems.map(({ to, icon: Icon, label }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors relative"
          style={{ color: pathname === to ? "var(--ink)" : "var(--muted-2)" }}
        >
          {pathname === to && (
            <span className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 bg-acid" />
          )}
          <Icon className="w-5 h-5" strokeWidth={pathname === to ? 2.5 : 1.8} />
          <span className="font-mono text-[10px] uppercase tracking-widest">{label}</span>
        </Link>
      ))}
    </nav>
  );
}