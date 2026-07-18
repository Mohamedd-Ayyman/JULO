import { useRef } from "react";
import { Send, Smile, Paperclip, Mic, Loader2 } from "lucide-react";
import EmojiPicker from "./EmojiPicker.jsx";
import ReplyPreview from "./ReplyPreview.jsx";
import AttachmentsPreview from "./AttachmentsPreview.jsx";

export default function ChatComposer({
  draft,
  onDraftChange,
  onSend,
  onTyping,
  attachments,
  onRemoveAttachment,
  replyToMessage,
  onCancelReply,
  showEmojiPicker,
  onToggleEmoji,
  onEmojiSelect,
  onCloseEmoji,
  linkPreview,
  clearLinkPreview,
  uploadingFiles,
  isRecording,
  sendingAudio,
  onStartRecording,
  fileInputRef,
  onFileSelect,
}) {
  return (
    <div
      className="chat-composer"
      style={{ borderTop: "1px solid var(--line-soft)", background: "var(--paper-2)" }}
    >
      <ReplyPreview message={replyToMessage} onCancel={onCancelReply} />
      <AttachmentsPreview attachments={attachments} onRemove={onRemoveAttachment} />

      {linkPreview && (
        <div className="px-4 pt-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>Link preview</span>
            <button
              onClick={clearLinkPreview}
              className="font-mono text-[10px] px-1.5 py-0.5 rounded"
              style={{ color: "var(--riso-red)", background: "rgba(217,122,108,0.1)" }}
            >
              Remove
            </button>
          </div>
          {linkPreview.image && (
            <div className="flex gap-2 p-2 rounded-lg" style={{ background: "var(--paper-3)", border: "1px solid var(--line-soft)" }}>
              <img src={linkPreview.image} alt="" className="w-16 h-16 object-cover rounded flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: "var(--ink)" }}>{linkPreview.title}</p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--muted)" }}>{linkPreview.siteName}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3 relative">
        {showEmojiPicker && (
          <EmojiPicker onSelect={onEmojiSelect} onClose={onCloseEmoji} />
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          className="hidden"
          onChange={onFileSelect}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="brutal-btn brutal-btn-ghost brutal-btn-icon"
            disabled={uploadingFiles}
            aria-label="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleEmoji}
            className="brutal-btn brutal-btn-ghost brutal-btn-icon"
            aria-label="Emoji picker"
          >
            <Smile className="w-4 h-4" />
          </button>
          <input
            value={draft}
            onChange={(e) => { onDraftChange(e.target.value); onTyping(); }}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), onSend())}
            placeholder={replyToMessage ? `Reply to ${replyToMessage.sender?.firstname || "someone"}…` : "Write a message…"}
            className="brutal-input rounded-full text-sm flex-1"
            style={{ paddingTop: 10, paddingBottom: 10 }}
          />
          {(draft.trim() || attachments.length > 0) ? (
            <button
              onClick={onSend}
              disabled={uploadingFiles}
              className="brutal-btn brutal-btn-primary brutal-btn-icon"
            >
              {uploadingFiles ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          ) : (
            <button
              onClick={onStartRecording}
              className="brutal-btn brutal-btn-primary brutal-btn-icon"
              aria-label="Record voice message"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
