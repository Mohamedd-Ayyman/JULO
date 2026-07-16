import { FileText, Download } from "lucide-react";

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileColor(mimeType) {
  if (!mimeType) return "var(--muted)";
  if (mimeType.includes("pdf")) return "#E53935";
  if (mimeType.includes("word") || mimeType.includes("document")) return "#1565C0";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "#2E7D32";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "#E65100";
  return "var(--muted)";
}

export default function FileMessage({ fileUrl, fileName, fileSize, mimeType, isMine }) {
  const color = getFileColor(mimeType);
  const ext = fileName?.split(".").pop()?.toUpperCase() || "FILE";

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 min-w-[220px] max-w-[280px] px-3 py-2.5 rounded-lg transition-all hover:scale-[1.01]"
      style={{
        background: isMine ? "rgba(236,230,216,0.08)" : "var(--paper-3)",
        border: `1px solid ${isMine ? "rgba(236,230,216,0.1)" : "var(--line-soft)"}`,
      }}
    >
      <div
        className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20`, color }}
      >
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: isMine ? "var(--paper)" : "var(--ink)" }}
        >
          {fileName || "File"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="font-mono text-[10px] font-bold px-1 py-0.5 rounded"
            style={{ background: `${color}15`, color }}
          >
            {ext}
          </span>
          {fileSize > 0 && (
            <span className="font-mono text-[10px]" style={{ color: isMine ? "rgba(236,230,216,0.5)" : "var(--muted)" }}>
              {formatSize(fileSize)}
            </span>
          )}
        </div>
      </div>
      <Download
        className="w-4 h-4 flex-shrink-0"
        style={{ color: isMine ? "rgba(236,230,216,0.5)" : "var(--muted)" }}
      />
    </a>
  );
}
