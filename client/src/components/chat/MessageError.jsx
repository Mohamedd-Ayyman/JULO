import { AlertCircle, RefreshCw, X } from "lucide-react";

export default function MessageError({ onRetry, onDelete }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" style={{ color: "var(--riso-red)" }} />
      <span className="text-[11px] font-medium" style={{ color: "var(--riso-red)" }}>
        Failed to send
      </span>
      <button
        onClick={onRetry}
        className="ml-0.5 p-0.5 rounded transition-colors hover:bg-[rgba(217,122,108,0.15)]"
        aria-label="Retry sending"
      >
        <RefreshCw className="w-3 h-3" style={{ color: "var(--riso-red)" }} />
      </button>
      <button
        onClick={onDelete}
        className="p-0.5 rounded transition-colors hover:bg-[rgba(217,122,108,0.15)]"
        aria-label="Delete message"
      >
        <X className="w-3 h-3" style={{ color: "var(--muted)" }} />
      </button>
    </div>
  );
}
