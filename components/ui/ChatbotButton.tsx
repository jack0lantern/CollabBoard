"use client";

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function ChatbotButton({
  onClick,
  isOpen,
}: {
  onClick: () => void;
  isOpen?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open AI assistant"
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
    >
      <ChatIcon className={`w-6 h-6 ${isOpen ? "opacity-70" : ""}`} />
    </button>
  );
}
