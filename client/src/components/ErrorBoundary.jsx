import React, { useEffect, useState } from "react";

export function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handler = (event) => {
      if (event.error !== null) setHasError(true);
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 pb-16">
        <div className="text-center max-w-md">
          <div className="sticker sticker-red inline-flex mb-6 text-xs">Error</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mb-3" style={{ color: "var(--ink)" }}>Something went wrong</h1>
          <p className="text-sm mb-8" style={{ color: "var(--muted-2)" }}>
            We encountered an unexpected error. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="brutal-btn brutal-btn-primary"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return children;
}