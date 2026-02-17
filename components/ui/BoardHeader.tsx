"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ShareModal } from "./ShareModal";
import type { Board } from "@/types";

export function BoardHeader({
  boardId,
  board,
  onBoardUpdated,
}: {
  boardId: string;
  board: Board | null;
  onBoardUpdated?: (board: Board) => void;
}) {
  const user = useCurrentUser();
  const [showShareModal, setShowShareModal] = useState(false);

  const isOwner = board != null && user != null && board.owner_id === user.uid;

  return (
    <>
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-semibold">
            {board?.title ?? "Board"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {isOwner && (
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
            >
              <ShareIcon />
              Share
            </button>
          )}
          <span className="text-sm text-gray-500">Auto-saving...</span>
        </div>
      </header>
      {showShareModal && board != null && (
        <ShareModal
          board={board}
          onClose={() => setShowShareModal(false)}
          onUpdated={(updated) => {
            onBoardUpdated?.(updated);
          }}
        />
      )}
    </>
  );
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
