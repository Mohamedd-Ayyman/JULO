function formatSeparatorDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDate.getTime() === today.getTime()) return "Today";
  if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 my-4 px-2">
      <div className="flex-1" style={{ borderTop: "1px solid var(--line-soft)" }} />
      <span
        className="font-mono text-[10px] font-medium tracking-wide uppercase flex-shrink-0"
        style={{ color: "var(--muted)" }}
      >
        {formatSeparatorDate(date)}
      </span>
      <div className="flex-1" style={{ borderTop: "1px solid var(--line-soft)" }} />
    </div>
  );
}
