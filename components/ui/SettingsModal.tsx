"use client";

import { useGrid } from "@/components/providers/GridProvider";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { gridVisible, setGridVisible } = useGrid();

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
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="grid-toggle" className="text-sm font-medium">
              Show grid
            </label>
            <button
              id="grid-toggle"
              role="switch"
              aria-checked={gridVisible}
              onClick={() => setGridVisible(!gridVisible)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                gridVisible
                  ? "bg-blue-600 dark:bg-blue-500"
                  : "bg-gray-200 dark:bg-gray-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                  gridVisible ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
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
