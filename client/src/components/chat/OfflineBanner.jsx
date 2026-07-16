import { WifiOff } from "lucide-react";

export default function OfflineBanner({ isOnline }) {
  if (isOnline) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium"
      style={{
        background: "color-mix(in oklab, var(--riso-yellow) 15%, transparent)",
        borderBottom: "1px solid color-mix(in oklab, var(--riso-yellow) 30%, transparent)",
        color: "var(--ink)",
        animation: "slideDown 250ms var(--ease-out) both",
      }}
    >
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--riso-yellow)" }} />
      <span>You're offline — messages will send when you reconnect</span>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
