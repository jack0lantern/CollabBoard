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
  const [isPublicReadonly, setIsPublicReadonly] = useState(
    board.is_public_readonly ?? false
  );
  const [sharedWith, setSharedWith] = useState<Record<string, ShareRole>>(
    board.shared_with ?? {}
  );
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardUrl, setBoardUrl] = useState("");
  const [readOnlyUrl, setReadOnlyUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedReadOnly, setCopiedReadOnly] = useState(false);

  useEffect(() => {
    setIsPublic(board.is_public ?? false);
    setIsPublicReadonly(board.is_public_readonly ?? false);
    setSharedWith(board.shared_with ?? {});
  }, [board.id, board.is_public, board.is_public_readonly, board.shared_with]);

  useEffect(() => {
    setBoardUrl(`${window.location.origin}/board/${board.id}`);
    setReadOnlyUrl(`${window.location.origin}/view/${board.id}`);
  }, [board.id]);

  const persistSharing = useCallback(
    async (updates: {
      is_public?: boolean;
      is_public_readonly?: boolean;
      shared_with?: Record<string, ShareRole>;
    }) => {
      setSaving(true);
      setError(null);
      try {
        const ok = await updateBoardSharing(board.id, updates);
        if (ok) {
          onUpdated?.({
            ...board,
            is_public: updates.is_public ?? isPublic,
            is_public_readonly: updates.is_public_readonly ?? isPublicReadonly,
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
    [board, isPublic, isPublicReadonly, sharedWith, onUpdated]
  );

  const handlePublicToggle = useCallback(
    async (checked: boolean) => {
      setIsPublic(checked);
      setIsPublicReadonly(checked ? false : isPublicReadonly);
      await persistSharing({
        is_public: checked,
        is_public_readonly: checked ? false : isPublicReadonly,
        shared_with: sharedWith,
      });
    },
    [sharedWith, isPublicReadonly, persistSharing]
  );

  const handlePublicReadonlyToggle = useCallback(
    async (checked: boolean) => {
      setIsPublicReadonly(checked);
      setIsPublic(checked ? false : isPublic);
      await persistSharing({
        is_public_readonly: checked,
        is_public: checked ? false : isPublic,
        shared_with: sharedWith,
      });
    },
    [sharedWith, isPublic, persistSharing]
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
    await persistSharing({
      is_public: isPublic,
      is_public_readonly: isPublicReadonly,
      shared_with: next,
    });
  }, [emailInput, sharedWith, isPublic, isPublicReadonly, persistSharing]);

  const handleRemoveEmail = useCallback(
    async (email: string) => {
      const rest = Object.fromEntries(
        Object.entries(sharedWith).filter(([k]) => k !== email)
      );
      setSharedWith(rest);
      await persistSharing({
        is_public: isPublic,
        is_public_readonly: isPublicReadonly,
        shared_with: rest,
      });
    },
    [sharedWith, isPublic, isPublicReadonly, persistSharing]
  );

  const handleCopyReadOnlyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(readOnlyUrl);
      setCopiedReadOnly(true);
      setTimeout(() => setCopiedReadOnly(false), 2000);
    } catch {
      setError("Failed to copy link");
    }
  }, [readOnlyUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(boardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy link");
    }
  }, [boardUrl]);

  const sharedEmails = Object.entries(sharedWith);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(26,26,46,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl p-6"
        style={{
          border: "3px solid #1a1a2e",
          boxShadow: "6px 6px 0 #1a1a2e",
          filter: "url(#hand-drawn)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-sketch text-2xl font-bold" style={{ color: "var(--crayon-green)" }}>
            🔗 Share board
          </h2>
          <button
            onClick={onClose}
            className="font-black text-xl leading-none hover:opacity-60 transition-opacity"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Copy link */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={boardUrl}
              className="flex-1 px-3 py-2 text-sm rounded-xl font-semibold truncate"
              style={{ background: "#f0fff5", border: "2px solid var(--crayon-green)", color: "#555" }}
            />
            <button
              onClick={() => { void handleCopyLink(); }}
              className="crayon-btn crayon-btn-green text-sm py-1.5 whitespace-nowrap"
            >
              {copied ? "Copied! ✓" : "Copy 📋"}
            </button>
          </div>

          {/* Public toggle - view & edit */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "#f0fff5", border: "2px solid var(--crayon-green)" }}
          >
            <button
              role="switch"
              aria-checked={isPublic}
              onClick={() => { void handlePublicToggle(!isPublic); }}
              disabled={saving}
              className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-all focus:outline-none disabled:opacity-50"
              style={{
                border: "2.5px solid #1a1a2e",
                background: isPublic ? "var(--crayon-green)" : "#e5e7eb",
                boxShadow: "2px 2px 0 #1a1a2e",
              }}
            >
              <span
                className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5"
                style={{
                  border: "1.5px solid #1a1a2e",
                  transform: isPublic ? "translateX(1.4rem)" : "translateX(0.15rem)",
                }}
              />
            </button>
            <label className="text-sm font-bold">
              🌍 Anyone with link can view & edit
            </label>
          </div>

          {/* Read-only link section */}
          <div
            className="flex flex-col gap-2 p-3 rounded-xl"
            style={{ background: "#f0f5ff", border: "2px solid var(--crayon-blue)" }}
          >
            <div className="flex items-center gap-3">
              <button
                role="switch"
                aria-checked={isPublicReadonly}
                onClick={() => { void handlePublicReadonlyToggle(!isPublicReadonly); }}
                disabled={saving}
                className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-all focus:outline-none disabled:opacity-50"
                style={{
                  border: "2.5px solid #1a1a2e",
                  background: isPublicReadonly ? "var(--crayon-blue)" : "#e5e7eb",
                  boxShadow: "2px 2px 0 #1a1a2e",
                }}
              >
                <span
                  className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5"
                  style={{
                    border: "1.5px solid #1a1a2e",
                    transform: isPublicReadonly ? "translateX(1.4rem)" : "translateX(0.15rem)",
                  }}
                />
              </button>
              <label className="text-sm font-bold">
                👁️ Anyone with link can view only (no edits)
              </label>
            </div>
            {isPublicReadonly && (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={readOnlyUrl}
                  className="flex-1 px-3 py-2 text-sm rounded-xl font-semibold truncate"
                  style={{ background: "#fff", border: "2px solid var(--crayon-blue)", color: "#555" }}
                />
                <button
                  onClick={() => { void handleCopyReadOnlyLink(); }}
                  className="crayon-btn crayon-btn-blue text-sm py-1.5 whitespace-nowrap"
                >
                  {copiedReadOnly ? "Copied! ✓" : "Copy 📋"}
                </button>
              </div>
            )}
          </div>

          {/* Add by email */}
          <div>
            <label className="block text-sm font-bold mb-2">
              ✉️ Add people by email
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleAddEmail(); }}
                placeholder="friend@school.com"
                className="flex-1 px-3 py-2 text-sm rounded-xl font-semibold focus:outline-none"
                style={{ border: "2.5px solid #1a1a2e", boxShadow: "2px 2px 0 #1a1a2e" }}
              />
              <button
                onClick={() => { void handleAddEmail(); }}
                className="crayon-btn crayon-btn-blue text-sm py-1.5"
              >
                Add
              </button>
            </div>
          </div>

          {/* People list */}
          {sharedEmails.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-2">👥 People with access</p>
              <ul className="space-y-2">
                {sharedEmails.map(([email, role]) => (
                  <li
                    key={email}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: "#f0f5ff", border: "2px solid var(--crayon-blue)" }}
                  >
                    <span>
                      {email}
                      <span
                        className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: "var(--crayon-blue)", color: "white" }}
                      >
                        {role}
                      </span>
                    </span>
                    <button
                      onClick={() => { void handleRemoveEmail(email); }}
                      disabled={saving}
                      className="text-xs font-black disabled:opacity-50"
                      style={{ color: "var(--crayon-red)" }}
                    >
                      Remove ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p
              className="text-sm font-bold px-3 py-2 rounded-xl"
              style={{ background: "#fff5f5", border: "2px solid var(--crayon-red)", color: "var(--crayon-red)" }}
            >
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="crayon-btn crayon-btn-ghost text-sm">
            Done ✓
          </button>
        </div>
      </div>
    </div>
  );
}
