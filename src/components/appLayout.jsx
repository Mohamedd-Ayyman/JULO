import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, MobileNav, TopBar } from "./nav.jsx";
import RightRail from "./RightRail.jsx";

/**
 * AppLayout — Three-column shell (desktop):
 *  ┌───────────┬────────────────┬────────────┐
 *  │  Sidebar  │   Main feed    │  RightRail │
 *  └───────────┴────────────────┴────────────┘
 *  + mobile top bar + bottom nav
 */
export default function AppLayout({ children, title, hideRightRail = false, fullWidth = false }) {
  return (
    <div className="min-h-screen text-foreground pb-16 lg:pb-0">
      <Sidebar />
      <TopBar title={title} />
      <div
        className={`lg:ml-[280px] ${fullWidth ? "" : "xl:mr-[336px]"} min-h-screen flex flex-col`}
      >
        <main className="flex-1 pb-16 lg:pb-0">
          {children || <Outlet />}
        </main>
      </div>
      {!hideRightRail && !fullWidth && <RightRail />}
      <MobileNav />
    </div>
  );
}