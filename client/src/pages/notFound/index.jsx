import React from "react";
import { Link } from "react-router-dom";
import Logo from "../../components/Logo.jsx";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 pb-16 relative overflow-hidden" style={{ background: "var(--paper)" }}>
      <div className="text-center max-w-md relative z-10 animate-fade-in-up">
        <div className="flex justify-center mb-8"><Logo size={48} /></div>
        <div className="sticker sticker-paper inline-flex mb-6 text-xs">404</div>
        <p
          className="font-display font-black leading-none mb-2"
          style={{ fontSize: "clamp(64px, 15vw, 120px)", letterSpacing: "-0.04em", color: "var(--ink)" }}
        >
          404
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight mb-3" style={{ color: "var(--ink)" }}>
          Lost in the cosmos
        </h1>
        <p className="font-mono text-sm mb-8" style={{ color: "var(--muted-2)" }}>
          The page you're looking for drifted into a parallel universe.
        </p>
        <Link to="/" className="brutal-btn brutal-btn-primary px-7 py-3">
          Take me home
        </Link>
      </div>
    </div>
  );
}