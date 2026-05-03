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
        <div className="absolute inset-0 bg-gradient-primary opacity-20 animate-gradient" style={{ backgroundSize: "200% 200%" }} />
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/30 blur-[120px] animate-float" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/20 blur-[120px] animate-float" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 animate-fade-in-down">
          <Logo size={36} />
        </div>

        <div className="relative z-10 max-w-md animate-fade-in-up">
          <h1 className="text-5xl font-extrabold tracking-tight leading-[1.05] mb-5">
            A <span className="text-gradient-accent">new universe</span><br />
            of social.
          </h1>
          <p className="text-lg text-foreground-soft mb-10 leading-relaxed">
            Real-time chat, beautiful posts, and a feed built around the people you actually care about.
          </p>
          <div className="space-y-4 stagger">
            <Feature icon={Sparkles} title="Beautifully simple" desc="A premium interface that gets out of your way." />
            <Feature icon={Zap} title="Real-time everything" desc="Messages, likes and notifications in milliseconds." />
            <Feature icon={Globe2} title="Connect globally" desc="Find people who share your passions." />
          </div>
        </div>

        <div className="relative z-10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} JULO. All rights reserved.
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute inset-0 lg:hidden bg-gradient-mesh" />
        <div className="w-full max-w-sm relative animate-fade-in-up">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size={32} />
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight mb-1.5">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
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
      <div className="w-10 h-10 rounded-xl bg-glass-strong border border-glass-border-strong grid place-items-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
