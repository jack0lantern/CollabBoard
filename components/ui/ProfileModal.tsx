"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { getProfile, updateProfile } from "@/lib/supabase/profiles";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const user = useCurrentUser();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getProfile(user.id).then((profile) => {
      if (!cancelled && profile) {
        setDisplayName(profile.display_name ?? user.displayName ?? "");
      } else if (!cancelled) {
        setDisplayName(user.displayName ?? "");
      }
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.displayName]);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    try {
      const ok = await updateProfile(user.id, {
        display_name: displayName.trim() || undefined,
      });
      if (!ok) setError("Failed to update profile");
    } catch {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }, [user?.id, displayName]);

  const handleLogOut = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
      router.replace("/login");
    }
    onClose();
  }, [router, onClose]);

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
          <h2 className="text-lg font-semibold">Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </p>
          ) : (
            <>
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-sm font-medium mb-2"
                >
                  Display name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                />
              </div>
              {user?.email && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.email}
                </p>
              )}
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-between mt-6 gap-2">
          <button
            onClick={handleLogOut}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:underline"
          >
            Log out
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
