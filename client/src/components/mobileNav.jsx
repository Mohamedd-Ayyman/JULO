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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-glass border-t border-glass-border flex justify-around py-2 z-40">
      {navItems.map(({ to, icon: Icon, label }) => (
        <Link
          key={to}
          to={to}
          className={`flex flex-col items-center space-y-0.5 px-3 py-1 rounded-lg transition-colors ${
            pathname === to ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="text-[10px]">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
