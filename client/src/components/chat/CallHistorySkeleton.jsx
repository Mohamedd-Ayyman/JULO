import React from "react";

export default function CallHistorySkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="skeleton flex-shrink-0" style={{ width: 44, height: 44 }} />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-32" />
            <div className="flex items-center gap-2">
              <div className="skeleton h-2.5 w-16" />
              <div className="skeleton h-2.5 w-24" />
            </div>
          </div>
          <div className="skeleton h-3 w-12 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}
