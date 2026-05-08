import React from "react";

export default function LoadingIndicator() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-safe">
      <div className="spinner" />
    </div>
  );
}
