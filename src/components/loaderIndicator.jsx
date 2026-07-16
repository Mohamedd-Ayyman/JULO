import React from "react";

export default function LoadingIndicator() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(243,236,217,0.85)", backdropFilter: "blur(6px)" }}
    >
      <div className="spinner" />
    </div>
  );
}
