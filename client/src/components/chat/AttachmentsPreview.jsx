import { X, FileText, Image as ImageIcon } from "lucide-react";

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentThumb({ attachment, onRemove }) {
  const isImage = attachment.type === "image";
  return (
    <div className="relative flex-shrink-0 group">
      {isImage && attachment.preview ? (
        <img
          src={attachment.preview}
          alt={attachment.file.name}
          className="w-20 h-20 object-cover rounded"
          style={{ border: "1px solid var(--line-soft)" }}
        />
      ) : (
        <div
          className="w-20 h-20 flex flex-col items-center justify-center gap-1 rounded"
          style={{ background: "var(--paper-3)", border: "1px solid var(--line-soft)" }}
        >
          {isImage ? (
            <ImageIcon className="w-5 h-5" style={{ color: "var(--muted)" }} />
          ) : (
            <FileText className="w-5 h-5" style={{ color: "var(--muted)" }} />
          )}
          <span className="font-mono text-[9px] px-1 truncate max-w-[70px]" style={{ color: "var(--muted)" }}>
            {attachment.file.name?.split(".").pop()?.toUpperCase()}
          </span>
        </div>
      )}
      {attachment.uploading && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--paper)", borderTopColor: "transparent" }} />
        </div>
      )}
      <button
        onClick={() => onRemove()}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "var(--riso-red)", color: "var(--paper)" }}
        aria-label="Remove attachment"
      >
        <X className="w-3 h-3" />
      </button>
      {!attachment.uploading && (
        <p className="font-mono text-[9px] mt-0.5 text-center truncate max-w-[80px]" style={{ color: "var(--muted)" }}>
          {formatSize(attachment.file.size)}
        </p>
      )}
    </div>
  );
}

export default function AttachmentsPreview({ attachments, onRemove }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="px-4 pt-2 flex gap-2 overflow-x-auto" style={{ borderTop: "1px solid var(--line-soft)" }}>
      {attachments.map((a, i) => (
        <AttachmentThumb
          key={`${a.file.name}-${a.file.size}-${i}`}
          attachment={a}
          onRemove={() => onRemove(i)}
        />
      ))}
    </div>
  );
}
