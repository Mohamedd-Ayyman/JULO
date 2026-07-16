import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, MobileNav, TopBar } from "./nav.jsx";
import RightRail from "./RightRail.jsx";

/**
 * AppLayout — Editorial three-column shell.
 */
export default function AppLayout({ children, title, hideRightRail = false, fullWidth = false }) {
  return (
    <div className="min-h-screen" style={{ color: "var(--ink)" }}>
      <Sidebar />
      <TopBar title={title} />
      <div
        className={`lg:ml-[260px] ${fullWidth ? "" : "xl:mr-[320px]"} min-h-screen flex flex-col`}
      >
        <main className="flex-1 pb-24 lg:pb-6">{children || <Outlet />}</main>
      </div>
      {!hideRightRail && !fullWidth && <RightRail />}
      <MobileNav />
    </div>
  );
}
