import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import indexCss from "../index.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 pb-16" style={{ background: "var(--paper)" }}>
      <div className="max-w-md text-center">
        <div className="font-mono mb-6 text-xs uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>404</div>
        <h1 className="font-display text-7xl font-light tracking-tight" style={{ color: "var(--ink)" }}>404</h1>
        <h2 className="mt-4 font-display text-2xl font-light tracking-tight" style={{ color: "var(--ink)" }}>Page not found</h2>
        <p className="mt-3 text-sm" style={{ color: "var(--muted-2)" }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="brutal-btn brutal-btn-primary inline-flex items-center gap-2"
          >
            ← Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Julo — Mood-based social feed" },
      { name: "description", content: "A mood-based social feed for authentic sharing" },
      { name: "author", content: "Julo" },
      { property: "og:title", content: "Julo — Mood-based social feed" },
      { property: "og:description", content: "A mood-based social feed for authentic sharing" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,900;1,9..144,700;1,9..144,900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: indexCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="noise">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
