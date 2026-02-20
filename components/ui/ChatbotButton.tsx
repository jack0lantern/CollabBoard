"use client";

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
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
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-white transition-all flex items-center justify-center font-bold text-xl active:translate-x-[2px] active:translate-y-[2px]"
      style={{
        background: "var(--crayon-purple)",
        border: "3px solid #7200ab",
        boxShadow: isOpen ? "none" : "4px 4px 0 #7200ab",
        transform: isOpen ? "translate(2px, 2px)" : undefined,
      }}
      title="AI Assistant ✨"
    >
      {isOpen ? (
        <span className="text-base">✕</span>
      ) : (
        <ChatIcon className="w-6 h-6" />
      )}
    </button>
  );
}
