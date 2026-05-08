import React from "react";
import Logo from "../components/Logo.jsx";
import { Sparkles, Zap, Globe2 } from "lucide-react";

/**
 * AuthShell — Split layout: brand panel (left) + form (right).
 * Used by Login + Signup pages.
 */
export default function AuthShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div
        className="hidden lg:flex flex-col w-1/2 relative overflow-hidden p-12 justify-between"
        style={{ background: "var(--ink)" }}
      >
        <div className="absolute inset-0 grid-bg opacity-10" />

        <div className="relative z-10 animate-fade-in-down">
          <Logo size={36} withText />
        </div>

        <div className="relative z-10 max-w-md animate-fade-in-up">
          <h1 className="font-display text-5xl font-black tracking-tight leading-[1.05] mb-5" style={{ color: "var(--paper)" }}>
            A&nbsp;
            <span className="sticker" style={{ background: "var(--acid)", fontSize: "inherit" }}>
              new universe
            </span>
            <br />
            of social.
          </h1>
          <p className="font-mono text-sm mb-10 leading-relaxed" style={{ color: "var(--muted)" }}>
            Real-time chat, beautiful posts, and a feed built around the people you actually care about.
          </p>
          <div className="space-y-4 stagger">
            <Feature icon={Sparkles} title="Beautifully simple" desc="A premium interface that gets out of your way." />
            <Feature icon={Zap} title="Real-time everything" desc="Messages, likes and notifications in milliseconds." />
            <Feature icon={Globe2} title="Connect globally" desc="Find people who share your passions." />
          </div>
        </div>

        <div className="relative z-10 font-mono text-xs" style={{ color: "var(--muted)" }}>
          © {new Date().getFullYear()} JULO. All rights reserved.
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-sm relative animate-fade-in-up">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size={32} />
          </div>
          <div className="mb-8">
            <h2 className="font-display text-3xl font-black tracking-tight mb-1.5" style={{ color: "var(--ink)" }}>
              {title}
            </h2>
            {subtitle && (
              <p className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>
                {subtitle}
              </p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-10 h-10 rounded-md border-2 grid place-items-center flex-shrink-0"
        style={{ background: "var(--acid)", borderColor: "var(--paper)", boxShadow: "3px 3px 0 0 var(--paper)" }}
      >
        <Icon className="w-5 h-5" style={{ color: "var(--ink)" }} strokeWidth={2} />
      </div>
      <div>
        <p className="font-display text-sm font-bold" style={{ color: "var(--paper)" }}>{title}</p>
        <p className="font-mono text-[11px]" style={{ color: "var(--muted)" }}>{desc}</p>
      </div>
    </div>
  );
}