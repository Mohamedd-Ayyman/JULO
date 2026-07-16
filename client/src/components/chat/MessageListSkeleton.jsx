export default function MessageListSkeleton() {
  const rows = [
    { align: "start", widths: ["w-32", "w-48"] },
    { align: "end", widths: ["w-40", "w-24"] },
    { align: "start", widths: ["w-56"] },
    { align: "end", widths: ["w-36", "w-44"] },
    { align: "start", widths: ["w-28"] },
  ];

  return (
    <div className="space-y-3 py-2">
      {rows.map((row, i) => (
        <div
          key={i}
          className={`flex ${row.align === "end" ? "justify-end" : "justify-start"} gap-2`}
        >
          {row.align === "start" && (
            <div className="skeleton flex-shrink-0" style={{ width: 28, height: 28, borderRadius: "50%" }} />
          )}
          <div className="flex flex-col gap-1.5">
            {row.widths.map((w, j) => (
              <div
                key={j}
                className={`skeleton ${w} h-3`}
                style={{
                  borderRadius: "var(--r-sm)",
                  opacity: 1 - j * 0.15,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
