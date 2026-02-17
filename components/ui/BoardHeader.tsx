"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ShareModal } from "./ShareModal";
import { updateBoardTitle } from "@/lib/firebase/boards";
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(board?.title ?? "");

  const isOwner = board != null && user != null && board.owner_id === user.uid;

  useEffect(() => {
    setTitleInput(board?.title ?? "");
  }, [board?.title]);

  const handleSaveTitle = useCallback(async () => {
    const trimmed = titleInput.trim() || "Untitled Board";
    if (board && trimmed !== board.title) {
      onBoardUpdated?.({ ...board, title: trimmed });
      await updateBoardTitle(boardId, trimmed);
    }
    setIsEditingTitle(false);
  }, [board, boardId, titleInput, onBoardUpdated]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSaveTitle();
      }
      if (e.key === "Escape") {
        setTitleInput(board?.title ?? "");
        setIsEditingTitle(false);
      }
    },
    [board?.title, handleSaveTitle]
  );

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
          {isEditingTitle && isOwner ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="text-lg font-semibold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 min-w-[120px]"
            />
          ) : (
            <h1
              onClick={() => isOwner && setIsEditingTitle(true)}
              className={`text-lg font-semibold ${isOwner ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" : ""}`}
            >
              {board?.title ?? "Board"}
            </h1>
          )}
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
