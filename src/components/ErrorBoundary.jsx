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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">
            We encountered an unexpected error. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary-hover transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return children;
}