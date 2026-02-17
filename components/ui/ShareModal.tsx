"use client";

import { useCallback, useEffect, useState } from "react";
import { updateBoardSharing } from "@/lib/supabase/boards";
import type { Board, ShareRole } from "@/types";

export function ShareModal({
  board,
  onClose,
  onUpdated,
}: {
  board: Board;
  onClose: () => void;
  onUpdated?: (board: Board) => void;
}) {
  const [isPublic, setIsPublic] = useState(board.is_public ?? false);
  const [sharedWith, setSharedWith] = useState<Record<string, ShareRole>>(
    board.shared_with ?? {}
  );
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardUrl, setBoardUrl] = useState("");

  useEffect(() => {
    setIsPublic(board.is_public ?? false);
    setSharedWith(board.shared_with ?? {});
  }, [board.id, board.is_public, board.shared_with]);

  useEffect(() => {
    setBoardUrl(`${window.location.origin}/board/${board.id}`);
  }, [board.id]);

  const persistSharing = useCallback(
    async (updates: { is_public?: boolean; shared_with?: Record<string, ShareRole> }) => {
      setSaving(true);
      setError(null);
      try {
        const ok = await updateBoardSharing(board.id, updates);
        if (ok) {
          onUpdated?.({
            ...board,
            is_public: updates.is_public ?? isPublic,
            shared_with: updates.shared_with ?? sharedWith,
          });
        } else {
          setError("Failed to update sharing settings");
        }
      } catch {
        setError("Failed to update sharing settings");
      } finally {
        setSaving(false);
      }
    },
    [board, isPublic, sharedWith, onUpdated]
  );

  const handlePublicToggle = useCallback(
    async (checked: boolean) => {
      setIsPublic(checked);
      await persistSharing({ is_public: checked, shared_with: sharedWith });
    },
    [sharedWith, persistSharing]
  );

  const handleAddEmail = useCallback(async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    const next = { ...sharedWith, [email]: "editor" as ShareRole };
    setSharedWith(next);
    setEmailInput("");
    setError(null);
    await persistSharing({ is_public: isPublic, shared_with: next });
  }, [emailInput, sharedWith, isPublic, persistSharing]);

  const handleRemoveEmail = useCallback(
    async (email: string) => {
      const next = { ...sharedWith };
      delete next[email];
      setSharedWith(next);
      await persistSharing({ is_public: isPublic, shared_with: next });
    },
    [sharedWith, isPublic, persistSharing]
  );

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(boardUrl);
    } catch {
      setError("Failed to copy link");
    }
  }, [boardUrl]);

  const sharedEmails = Object.entries(sharedWith);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Share board</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              readOnly
              value={boardUrl}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Copy link
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is-public"
              checked={isPublic}
              onChange={(e) => handlePublicToggle(e.target.checked)}
              disabled={saving}
              className="rounded border-gray-300"
            />
            <label htmlFor="is-public" className="text-sm">
              Anyone with the link can view and edit
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Add people by email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
                placeholder="email@example.com"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              />
              <button
                onClick={handleAddEmail}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          {sharedEmails.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">People with access</p>
              <ul className="space-y-2">
                {sharedEmails.map(([email, role]) => (
                  <li
                    key={email}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {email}
                      <span className="text-gray-500 ml-1">({role})</span>
                    </span>
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      disabled={saving}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
