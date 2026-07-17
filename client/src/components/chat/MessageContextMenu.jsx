import * as ContextMenu from "@radix-ui/react-context-menu";
import { Copy, Smile, Trash2, Reply, Pencil } from "lucide-react";
import toast from "react-hot-toast";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export default function MessageContextMenu({
  children,
  message,
  isMine,
  onCopy,
  onReact,
  onDelete,
  onReply,
  onEdit,
}) {
  const handleCopy = () => {
    const text = message.text || message.imageUrl || message.fileUrl || "";
    navigator.clipboard?.writeText(text);
    toast.success("Copied!");
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="animate-scale-in"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            boxShadow: "var(--sh-2)",
            padding: 4,
            minWidth: 160,
            zIndex: 50,
          }}
        >
          <ContextMenu.Item
            onClick={onReply}
            className="flex items-center gap-2.5 px-3 py-2 text-sm rounded cursor-pointer outline-none"
            style={{ color: "var(--ink)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--paper-3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Reply className="w-3.5 h-3.5" style={{ color: "var(--muted)" }} />
            Reply
          </ContextMenu.Item>

          {isMine && message.text && (
            <ContextMenu.Item
              onClick={onEdit}
              className="flex items-center gap-2.5 px-3 py-2 text-sm rounded cursor-pointer outline-none"
              style={{ color: "var(--ink)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--paper-3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Pencil className="w-3.5 h-3.5" style={{ color: "var(--muted)" }} />
              Edit
            </ContextMenu.Item>
          )}

          {(message.text || message.imageUrl || message.fileUrl) && (
            <ContextMenu.Item
              onClick={onCopy || handleCopy}
              className="flex items-center gap-2.5 px-3 py-2 text-sm rounded cursor-pointer outline-none"
              style={{ color: "var(--ink)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--paper-3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Copy className="w-3.5 h-3.5" style={{ color: "var(--muted)" }} />
              Copy
            </ContextMenu.Item>
          )}

          <ContextMenu.Sub>
            <ContextMenu.SubTrigger
              className="flex items-center gap-2.5 px-3 py-2 text-sm rounded cursor-pointer outline-none"
              style={{ color: "var(--ink)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--paper-3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Smile className="w-3.5 h-3.5" style={{ color: "var(--muted)" }} />
              React
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent
                className="animate-scale-in"
                style={{
                  background: "var(--glass-bg)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  boxShadow: "var(--sh-2)",
                  padding: 6,
                  display: "flex",
                  gap: 2,
                  zIndex: 51,
                }}
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <ContextMenu.Item
                    key={emoji}
                    onClick={() => onReact(emoji)}
                    className="w-9 h-9 flex items-center justify-center rounded text-lg cursor-pointer outline-none transition-transform hover:scale-125"
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--paper-3)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {emoji}
                  </ContextMenu.Item>
                ))}
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          {isMine && (
            <>
              <ContextMenu.Separator className="my-1" style={{ height: 1, background: "var(--line-soft)" }} />
              <ContextMenu.Item
                onClick={() => onDelete(message._id)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm rounded cursor-pointer outline-none"
                style={{ color: "var(--riso-red)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(217,122,108,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
