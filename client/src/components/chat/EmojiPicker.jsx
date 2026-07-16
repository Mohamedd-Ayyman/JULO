import { useEffect, useRef } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

export default function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 z-50 animate-fade-in"
      style={{
        boxShadow: "var(--sh-3)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
      }}
    >
      <style>{`
        em-emoji-picker {
          --rgb-background: 32, 32, 32;
          --rgb-input: 40, 40, 40;
          --rgb-color: 236, 230, 216;
          --color-border: rgba(255,255,255,0.06);
          --color-border-over: rgba(255,255,255,0.12);
        }
      `}</style>
      <Picker
        data={data}
        onEmojiSelect={(emoji) => onSelect(emoji.native || emoji.id)}
        theme="dark"
        previewPosition="none"
        skinTonePosition="search"
        maxFrequentRows={2}
        perLine={8}
        emojiSize={28}
        emojiButtonSize={36}
        navPosition="bottom"
        searchPosition="sticky"
        set="native"
      />
    </div>
  );
}
