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
    void getProfile(user.id).then((profile) => {
      if (!cancelled && profile) {
        setDisplayName(profile.display_name ?? user.displayName ?? "");
      } else if (!cancelled) {
        setDisplayName(user.displayName ?? "");
      }
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
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
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(26,26,46,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl p-6"
        style={{
          border: "3px solid #1a1a2e",
          boxShadow: "6px 6px 0 #1a1a2e",
          filter: "url(#hand-drawn)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-sketch text-2xl font-bold" style={{ color: "var(--crayon-orange)" }}>
            👤 Profile
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
          {loading ? (
            <p className="text-sm font-bold" style={{ color: "var(--crayon-purple)" }}>
              Loading... 📚
            </p>
          ) : (
            <>
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-sm font-bold mb-2"
                >
                  ✏️ Display name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="crayon-input text-sm"
                />
              </div>
              {user?.email && (
                <p
                  className="text-sm font-semibold px-3 py-2 rounded-xl"
                  style={{ background: "#f0f5ff", border: "2px solid var(--crayon-blue)", color: "var(--crayon-blue)" }}
                >
                  📧 {user.email}
                </p>
              )}
              {error && (
                <p
                  className="text-sm font-bold px-3 py-2 rounded-xl"
                  style={{ background: "#fff5f5", border: "2px solid var(--crayon-red)", color: "var(--crayon-red)" }}
                >
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-between mt-6 gap-2">
          <button
            onClick={() => { void handleLogOut(); }}
            className="text-sm font-bold underline"
            style={{ color: "var(--crayon-red)" }}
          >
            Log out
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="crayon-btn crayon-btn-ghost text-sm py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={() => { void handleSave(); }}
              disabled={saving}
              className="crayon-btn crayon-btn-orange text-sm py-1.5 disabled:opacity-50"
            >
              {saving ? "Saving... 🖍️" : "Save ✓"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
