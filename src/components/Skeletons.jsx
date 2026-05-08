import React from "react";

export function PostSkeleton() {
  return (
    <div className="brutal-card p-5 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton" style={{ width: 40, height: 40 }} />
        <div className="flex-1 space-y-2">
          <div className="skeleton" style={{ height: 12, width: 128 }} />
          <div className="skeleton" style={{ height: 10, width: 80 }} />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="skeleton" style={{ height: 12 }} />
        <div className="skeleton" style={{ height: 12, width: "85%" }} />
        <div className="skeleton" style={{ height: 12, width: "70%" }} />
      </div>
      <div className="skeleton mb-4" style={{ height: 192 }} />
      <div className="flex items-center gap-6">
        <div className="skeleton" style={{ height: 12, width: 48 }} />
        <div className="skeleton" style={{ height: 12, width: 48 }} />
        <div className="skeleton" style={{ height: 12, width: 48 }} />
      </div>
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="brutal-card p-3 flex items-center gap-3">
          <div className="skeleton" style={{ width: 48, height: 48 }} />
          <div className="flex-1 space-y-2">
            <div className="skeleton" style={{ height: 12, width: 128 }} />
            <div className="skeleton" style={{ height: 10, width: 192 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="brutal-card p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="skeleton" style={{ width: 40, height: 40 }} />
        <div className="space-y-2">
          <div className="skeleton" style={{ height: 12, width: 112 }} />
          <div className="skeleton" style={{ height: 10, width: 144 }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 999 }} />
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="brutal-card p-4 flex items-start gap-3">
      <div className="skeleton flex-shrink-0" style={{ width: 36, height: 36 }} />
      <div className="flex-1 space-y-2 pt-1">
        <div className="skeleton" style={{ height: 12, width: "75%" }} />
        <div className="skeleton" style={{ height: 10, width: 96 }} />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton" style={{ height: 192 }} />
      <div className="flex items-end gap-4 px-4" style={{ marginTop: -48 }}>
        <div className="skeleton" style={{ width: 96, height: 96, border: "4px solid var(--paper)" }} />
        <div className="flex-1 space-y-2 pb-2">
          <div className="skeleton" style={{ height: 20, width: 192 }} />
          <div className="skeleton" style={{ height: 12, width: 128 }} />
        </div>
      </div>
      <div className="px-4 space-y-2">
        <div className="skeleton" style={{ height: 12, width: 256 }} />
        <div className="skeleton" style={{ height: 12, width: 192 }} />
      </div>
    </div>
  );
}

export function ImageSkeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}
