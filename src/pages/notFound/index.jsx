import React from "react";
import { Link } from "react-router-dom";
import Logo from "../../components/Logo.jsx";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full" style={{ background: "rgba(20,17,15,0.12)" }} />
      <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] rounded-full" style={{ background: "rgba(20,17,15,0.08)", animationDelay: "2s" }} />

      <div className="text-center max-w-md relative z-10 animate-fade-in-up">
        <div className="flex justify-center mb-8"><Logo size={36} /></div>
        <p
          className="text-[120px] font-black leading-none mb-2"
          style={{ background: "var(--acid)", color: "var(--ink)", display: "inline-block", padding: "0 12px" }}
        >
          404
        </p>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--ink)" }}>Lost in the cosmos</h1>
        <p className="mb-8" style={{ color: "var(--muted-2)" }}>
          The page you're looking for drifted into a parallel universe.
        </p>
        <Link to="/" className="brutal-btn brutal-btn-primary px-7 py-3 text-base">
          Take me home
        </Link>
      </div>
    </div>
  );
}
