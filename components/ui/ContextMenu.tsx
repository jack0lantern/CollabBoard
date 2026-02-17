"use client";

import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
}

export function ContextMenu({
  x,
  y,
  visible,
  onClose,
  items,
}: {
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current != null && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 min-w-[160px] rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      style={{
        left: x,
        top: y,
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          role="menuitem"
          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
