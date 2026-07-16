import { useEffect } from "react";
import { X, Mic, StopCircle } from "lucide-react";

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RecordingPanel({ duration, onCancel, onStop, error }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onCancel();
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onStop();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, onStop]);

  if (error) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderTop: "1px solid var(--line-soft)", background: "var(--paper-2)" }}
      >
        <Mic className="w-4 h-4" style={{ color: "var(--riso-red)" }} />
        <p className="text-sm flex-1" style={{ color: "var(--riso-red)" }}>{error}</p>
        <button onClick={onCancel} className="brutal-btn brutal-btn-ghost brutal-btn-icon">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderTop: "1px solid var(--line-soft)", background: "var(--paper-2)" }}
    >
      <button onClick={onCancel} className="brutal-btn brutal-btn-ghost brutal-btn-icon flex-shrink-0">
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="recording-dot flex-shrink-0" />
        <span className="font-mono text-xs" style={{ color: "var(--muted-2)" }}>REC</span>
        <span className="font-mono text-sm font-bold" style={{ color: "var(--ink)" }}>
          {formatDuration(duration)}
        </span>
        <div className="flex items-center gap-[2px] ml-2">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="recording-bar"
              style={{ animationDelay: `${i * 0.06}s` }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={onStop}
        className="brutal-btn brutal-btn-primary brutal-btn-icon flex-shrink-0"
        aria-label="Send recording"
      >
        <StopCircle className="w-4 h-4" />
      </button>

      <style>{`
        .recording-dot {
          width: 8px;
          height: 8px;
          background: var(--riso-red);
          border-radius: 50%;
          animation: recPulse 1.2s ease-in-out infinite;
        }
        @keyframes recPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        .recording-bar {
          width: 2.5px;
          height: 16px;
          background: var(--riso-red);
          border-radius: 1px;
          animation: recBar 0.8s ease-in-out infinite alternate;
        }
        @keyframes recBar {
          0% { height: 4px; opacity: 0.3; }
          100% { height: 20px; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
