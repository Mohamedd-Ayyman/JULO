import { ExternalLink } from "lucide-react";

export default function LinkPreview({ preview }) {
  if (!preview) return null;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 rounded-lg overflow-hidden transition-all hover:scale-[1.005]"
      style={{
        border: "1px solid var(--line-soft)",
        maxWidth: 320,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {preview.image && (
        <div className="w-full h-[120px] overflow-hidden" style={{ background: "var(--paper-3)" }}>
          <img
            src={preview.image}
            alt={preview.title || "Link preview"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="px-3 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-wide mb-0.5" style={{ color: "var(--muted)" }}>
          {preview.siteName || new URL(preview.url).hostname}
        </p>
        <p className="text-sm font-bold line-clamp-2" style={{ color: "var(--ink)" }}>
          {preview.title}
        </p>
        {preview.description && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--muted)" }}>
            {preview.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1.5">
          <ExternalLink className="w-3 h-3" style={{ color: "var(--acid)" }} />
          <span className="font-mono text-[10px] truncate" style={{ color: "var(--acid)" }}>
            {preview.url}
          </span>
        </div>
      </div>
    </a>
  );
}
