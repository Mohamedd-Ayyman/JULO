import React from "react";

export function PostSkeleton() {
  return (
    <div className="brutal-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton" style={{ width: 44, height: 44 }} />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-2.5 w-20" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-5/6" />
        <div className="skeleton h-3 w-3/4" />
      </div>
      <div className="skeleton h-48 w-full mb-4" />
      <div className="flex items-center gap-6">
        <div className="skeleton h-3 w-12" />
        <div className="skeleton h-3 w-12" />
        <div className="skeleton h-3 w-12" />
      </div>
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="skeleton" style={{ width: 48, height: 48 }} />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-32" />
            <div className="skeleton h-2.5 w-48" />
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
          <div className="skeleton h-3 w-28" />
          <div className="skeleton h-2.5 w-36" />
        </div>
      </div>
      <div className="skeleton h-8 w-20" />
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 brutal-card">
      <div className="skeleton flex-shrink-0" style={{ width: 36, height: 36 }} />
      <div className="flex-1 space-y-2 pt-1">
        <div className="skeleton h-3 w-3/4" />
        <div className="skeleton h-2.5 w-24" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-48" />
      <div className="flex items-end gap-4 px-4 -mt-12">
        <div className="skeleton" style={{ width: 96, height: 96, border: "3px solid var(--paper)" }} />
        <div className="flex-1 space-y-2 pb-2">
          <div className="skeleton h-5 w-48" />
          <div className="skeleton h-3 w-32" />
        </div>
      </div>
      <div className="px-4 space-y-2">
        <div className="skeleton h-3 w-64" />
        <div className="skeleton h-3 w-48" />
      </div>
    </div>
  );
}

export function ImageSkeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}
