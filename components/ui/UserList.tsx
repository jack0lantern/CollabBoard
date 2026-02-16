"use client";

import { useOthers } from "@/lib/liveblocks/client";

export function UserList() {
  const others = useOthers();

  return (
    <div className="flex gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {others.map((user) => {
        const name =
          (user.info as { name?: string } | undefined)?.name ?? "Anonymous";
        return (
          <div
            key={user.id}
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
