import React from "react";

export function PostSkeleton() {
  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 skeleton" />
          <div className="h-2.5 w-20 skeleton" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 w-full skeleton" />
        <div className="h-3 w-5/6 skeleton" />
        <div className="h-3 w-3/4 skeleton" />
      </div>
      <div className="h-48 w-full skeleton mb-4" />
      <div className="flex items-center gap-6">
        <div className="h-3 w-12 skeleton" />
        <div className="h-3 w-12 skeleton" />
        <div className="h-3 w-12 skeleton" />
      </div>
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
          <div className="w-12 h-12 rounded-full skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 skeleton" />
            <div className="h-2.5 w-48 skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="card p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full skeleton" />
        <div className="space-y-2">
          <div className="h-3 w-28 skeleton" />
          <div className="h-2.5 w-36 skeleton" />
        </div>
      </div>
      <div className="h-8 w-20 skeleton rounded-full" />
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 card">
      <div className="w-9 h-9 rounded-full skeleton flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 w-3/4 skeleton" />
        <div className="h-2.5 w-24 skeleton" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-48 skeleton" />
      <div className="flex items-end gap-4 px-4 -mt-12">
        <div className="w-24 h-24 rounded-full skeleton border-4 border-background" />
        <div className="flex-1 space-y-2 pb-2">
          <div className="h-5 w-48 skeleton" />
          <div className="h-3 w-32 skeleton" />
        </div>
      </div>
      <div className="px-4 space-y-2">
        <div className="h-3 w-64 skeleton" />
        <div className="h-3 w-48 skeleton" />
      </div>
    </div>
  );
}

export function ImageSkeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}
