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
      <div className="hidden lg:flex flex-col w-1/2 relative overflow-hidden p-12 justify-between">
        <div className="absolute inset-0" style={{ background: "var(--paper-2)" }} />
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full" style={{ background: "rgba(20,17,15,0.12)" }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full" style={{ background: "rgba(20,17,15,0.08)" }} />

        <div className="relative z-10 animate-fade-in-down">
          <Logo size={36} />
        </div>

        <div className="relative z-10 max-w-md animate-fade-in-up">
          <h1 className="text-5xl font-extrabold tracking-tight leading-[1.05] mb-5" style={{ color: "var(--ink)" }}>
            A <span style={{ background: "var(--acid)", color: "var(--ink)", padding: "0 6px" }}>new universe</span><br />
            of social.
          </h1>
          <p className="text-lg mb-10 leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Real-time chat, beautiful posts, and a feed built around the people you actually care about.
          </p>
          <div className="space-y-4 stagger">
            <Feature icon={Sparkles} title="Beautifully simple" desc="A premium interface that gets out of your way." />
            <Feature icon={Zap} title="Real-time everything" desc="Messages, likes and notifications in milliseconds." />
            <Feature icon={Globe2} title="Connect globally" desc="Find people who share your passions." />
          </div>
        </div>

        <div className="relative z-10 text-xs" style={{ color: "var(--muted-2)" }}>
          © {new Date().getFullYear()} JULO. All rights reserved.
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute inset-0 lg:hidden" style={{ background: "var(--paper)" }} />
        <div className="w-full max-w-sm relative animate-fade-in-up">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size={32} />
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight mb-1.5" style={{ color: "var(--ink)" }}>{title}</h2>
            {subtitle && <p className="text-sm" style={{ color: "var(--muted-2)" }}>{subtitle}</p>}
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
        className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
        style={{ background: "var(--paper-3)", border: "2px solid var(--ink)", boxShadow: "var(--sh-1)" }}
      >
        <Icon className="w-5 h-5" style={{ color: "var(--ink)" }} />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</p>
        <p className="text-xs" style={{ color: "var(--muted-2)" }}>{desc}</p>
      </div>
    </div>
  );
}
