"use client";

import { useState } from "react";
import { usePresence } from "@/hooks/usePresence";

const DOT_COLORS = [
  "bg-red-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
];

function getDotColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return DOT_COLORS[Math.abs(hash) % DOT_COLORS.length];
}

function UserDot({ userId, displayName }: { userId: string; displayName: string }) {
  const [hovered, setHovered] = useState(false);
  const colorClass = getDotColor(userId);
  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-xs font-semibold text-white shadow-sm cursor-default select-none`}
        title={displayName}
      >
        {initial}
      </div>
      {hovered && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 rounded bg-gray-900 dark:bg-gray-700 text-white text-xs whitespace-nowrap shadow-lg z-50 pointer-events-none">
          {displayName}
        </div>
      )}
    </div>
  );
}

export function UserList() {
  const { others } = usePresence();

  if (others.length === 0) return null;

  return (
    <div className="flex gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {others.map((user) => (
        <UserDot
          key={user.userId}
          userId={user.userId}
          displayName={user.displayName ?? "Anonymous"}
        />
      ))}
    </div>
  );
}
