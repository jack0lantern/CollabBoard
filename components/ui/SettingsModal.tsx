"use client";

import { useGrid } from "@/components/providers/GridProvider";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { gridVisible, setGridVisible } = useGrid();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
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
            ⚙️ Settings
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
          <div
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: "#fff5f0", border: "2px solid var(--crayon-orange)" }}
          >
            <label htmlFor="grid-toggle" className="text-sm font-bold">
              📐 Show grid
            </label>
            <button
              id="grid-toggle"
              role="switch"
              aria-checked={gridVisible}
              onClick={() => setGridVisible(!gridVisible)}
              className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-all focus:outline-none"
              style={{
                border: "2.5px solid #1a1a2e",
                background: gridVisible ? "var(--crayon-green)" : "#e5e7eb",
                boxShadow: "2px 2px 0 #1a1a2e",
              }}
            >
              <span
                className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5"
                style={{
                  border: "1.5px solid #1a1a2e",
                  transform: gridVisible ? "translateX(1.4rem)" : "translateX(0.15rem)",
                }}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="crayon-btn crayon-btn-orange text-sm"
          >
            Done ✓
          </button>
        </div>
      </div>
    </div>
  );
}
