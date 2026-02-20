"use client";

import { useEffect, useRef, useState } from "react";

export interface UserBadgeUser {
  displayName: string | null;
  email: string | null;
}

export function UserBadge({ user }: { user: UserBadgeUser }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const label = user.displayName ?? user.email ?? "Account";

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current != null && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="px-2.5 py-1 rounded-xl font-bold text-sm transition-all cursor-pointer"
        style={{
          border: "2px solid var(--crayon-orange)",
          boxShadow: "2px 2px 0 var(--crayon-orange)",
          color: "var(--crayon-orange)",
        }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="User info"
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[180px] px-3 py-2 rounded-lg border-2 bg-white shadow-lg"
          style={{
            borderColor: "var(--crayon-orange)",
            boxShadow: "3px 3px 0 var(--crayon-orange)",
          }}
        >
          <p className="text-sm font-semibold text-gray-700 break-all">
            {user.email ?? "No email"}
          </p>
        </div>
      )}
    </div>
  );
}
