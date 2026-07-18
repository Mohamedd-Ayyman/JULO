import { useEffect, useRef } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useIsMobile, useScreenSize } from "../../hooks/use-mobile.jsx";

export default function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);
  const screenSize = useScreenSize();
  const isMobileView = screenSize === "mobile";
  const isTabletView = screenSize === "tablet";

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (isMobileView) {
    return (
      <>
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <div
          ref={ref}
          className="fixed bottom-0 left-0 right-0 z-50 animate-slide-in-bottom"
          style={{
            boxShadow: "var(--sh-3)",
            borderRadius: "var(--r-lg) var(--r-lg) 0 0",
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
            maxFrequentRows={3}
            perLine={7}
            emojiSize={32}
            emojiButtonSize={44}
            navPosition="bottom"
            searchPosition="sticky"
            set="native"
          />
        </div>
      </>
    );
  }

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
