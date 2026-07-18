import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import WaveformBars from "./WaveformBars.jsx";

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AudioMessage({ audioUrl, duration: totalDuration, isMine }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(totalDuration || 0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoaded = () => {
      setDuration(el.duration || totalDuration || 0);
      setReady(true);
    };
    const onTime = () => setCurrentTime(el.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    if (el.readyState >= 1) onLoaded();

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, [audioUrl, totalDuration]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      if (el.ended) el.currentTime = 0;
      el.play().catch(() => {});
    }
    setPlaying(!playing);
  }, [playing]);

  const handleSeek = useCallback(
    (ratio) => {
      const el = audioRef.current;
      if (!el || !duration) return;
      el.currentTime = ratio * duration;
      setCurrentTime(el.currentTime);
    },
    [duration]
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  const playedColor = isMine ? "var(--paper)" : "var(--acid)";
  const unplayedColor = isMine ? "rgba(236,230,216,0.3)" : "var(--ink-soft)";

  return (
    <div className="flex items-center gap-3 min-w-[220px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        style={{
          background: isMine ? "rgba(236,230,216,0.15)" : "var(--paper-3)",
          color: isMine ? "var(--paper)" : "var(--ink)",
        }}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <WaveformBars
          barCount={28}
          progress={progress}
          playedColor={playedColor}
          unplayedColor={unplayedColor}
          onClick={ready ? handleSeek : undefined}
        />
      </div>

      <span
        className="font-mono text-[10px] flex-shrink-0 tabular-nums"
        style={{ color: isMine ? "rgba(236,230,216,0.6)" : "var(--muted)" }}
      >
        {formatTime(duration || 0)}
      </span>
    </div>
  );
}
