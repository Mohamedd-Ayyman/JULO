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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 pb-16">
        <div className="text-center max-w-md">
          <div className="sticker sticker-red inline-flex mb-6 text-xs">Error</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mb-3">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-8">
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
