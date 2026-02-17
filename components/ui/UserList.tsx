"use client";

import { usePresence } from "@/hooks/usePresence";

export function UserList() {
  const { others } = usePresence();

  return (
    <div className="flex gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {others.map((user) => {
        const name = user.displayName ?? "Anonymous";
        return (
          <div
            key={user.userId}
            className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium"
            title={name}
          >
            {name[0]}
          </div>
        );
      })}
    </div>
  );
}
