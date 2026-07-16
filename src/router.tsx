import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-16">
      <div className="max-w-md text-center">
        <div className="sticker sticker-red inline-flex mb-6 text-xs">Error</div>
        <h1 className="font-display text-6xl font-light tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {import.meta.env.DEV && error.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md border-2 border-foreground bg-paper p-3 text-left font-mono text-xs text-destructive text-left">
            {error.message}
          </pre>
        )}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="brutal-btn brutal-btn-primary"
          >
            Try again
          </button>
          <a href="/" className="brutal-btn brutal-btn-ink">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });

  return router;
};