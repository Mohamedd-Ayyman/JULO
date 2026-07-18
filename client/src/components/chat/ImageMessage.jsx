import { useState } from "react";
import { X } from "lucide-react";

export default function ImageMessage({ imageUrl, text }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <div className="relative">
        {!loaded && (
          <div
            className="w-full max-w-[300px] h-[180px] rounded-lg animate-pulse"
            style={{ background: "var(--paper-3)" }}
          />
        )}
        <img
          src={imageUrl}
          alt={text || "Image"}
          className="max-w-[300px] max-h-[300px] rounded-lg cursor-pointer transition-opacity hover:opacity-90"
          style={{ display: loaded ? "block" : "none" }}
          onLoad={() => setLoaded(true)}
          onClick={() => setOpen(true)}
        />
        {text && (
          <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words">{text}</p>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full grid place-items-center"
            style={{ background: "rgba(255,255,255,0.1)", color: "var(--paper)" }}
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={imageUrl}
            alt={text || "Image"}
            className="max-w-full max-h-full object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
