"use client";

import Link from "next/link";

export function BoardHeader({ boardId }: { boardId: string }) {
  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ← Back
        </Link>
        <h1 className="text-lg font-semibold">Board</h1>
      </div>
      <div className="text-sm text-gray-500">Auto-saving...</div>
    </header>
  );
}
