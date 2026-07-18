import { useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectCallId, selectCallStatus } from "../../../redux/callSlice.js";

export default function CallTimer() {
  const callStartTime = useSelector((state) => state.callReducer.callStartTime);
  const status = useSelector(selectCallStatus);
  const timerRef = useRef(null);
  const displayRef = useRef(null);

  useEffect(() => {
    if (status !== "active" || !callStartTime) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const update = () => {
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      if (displayRef.current) {
        displayRef.current.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
    };

    update();
    timerRef.current = setInterval(update, 1000);
    return () => clearInterval(timerRef.current);
  }, [status, callStartTime]);

  return (
    <span ref={displayRef} className="font-mono text-sm tabular-nums" style={{ color: "var(--paper)" }}>
      00:00
    </span>
  );
}
