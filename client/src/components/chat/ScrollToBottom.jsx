import { ChevronDown } from "lucide-react";

export default function ScrollToBottom({ visible, onClick, unseenCount }) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 font-medium text-xs transition-all"
      style={{
        background: "var(--paper-2)",
        color: "var(--ink)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-pill)",
        boxShadow: "var(--sh-2)",
        zIndex: 10,
        animation: "slideUp 200ms var(--ease-out) both",
      }}
    >
      <ChevronDown className="w-3.5 h-3.5" />
      {unseenCount > 0 && (
        <span
          className="font-mono text-[10px] font-bold px-1.5 py-0.5"
          style={{
            background: "var(--riso-red)",
            color: "var(--paper)",
            borderRadius: "var(--r-pill)",
            minWidth: 16,
            textAlign: "center",
          }}
        >
          {unseenCount > 99 ? "99+" : unseenCount}
        </span>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 10px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </button>
  );
}
