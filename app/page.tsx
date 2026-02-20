import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen paper-bg flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Decorative crayon scribbles in corners */}
      <div
        className="absolute top-8 left-8 w-16 h-16 rounded-full opacity-30"
        style={{ background: "var(--crayon-red)" }}
      />
      <div
        className="absolute top-12 left-16 w-10 h-10 rounded-full opacity-20"
        style={{ background: "var(--crayon-orange)" }}
      />
      <div
        className="absolute bottom-10 right-10 w-20 h-20 rounded-full opacity-25"
        style={{ background: "var(--crayon-blue)" }}
      />
      <div
        className="absolute bottom-20 right-24 w-12 h-12 rounded-full opacity-20"
        style={{ background: "var(--crayon-purple)" }}
      />
      <div
        className="absolute top-1/4 right-12 w-8 h-8 rotate-45 opacity-25"
        style={{ background: "var(--crayon-green)" }}
      />
      <div
        className="absolute bottom-1/4 left-10 w-10 h-10 rotate-12 opacity-20"
        style={{ background: "var(--crayon-yellow)" }}
      />

      <div className="text-center z-10">
        {/* Title */}
        <div className="mb-2">
          <span
            className="font-sketch text-7xl font-bold"
            style={{ color: "var(--crayon-red)" }}
          >
            Collab
          </span>
          <span
            className="font-sketch text-7xl font-bold"
            style={{ color: "var(--crayon-blue)" }}
          >
            Board
          </span>
        </div>

        {/* Subtitle on a sticky-note style strip */}
        <div
          className="inline-block px-6 py-2 mb-10 rounded-lg font-bold text-lg"
          style={{
            background: "var(--crayon-yellow)",
            border: "2.5px solid #b39700",
            boxShadow: "3px 3px 0 #b39700",
            transform: "rotate(-1deg)",
            color: "#1a1a2e",
          }}
        >
          ✏️ Real-time collaborative whiteboard
        </div>

        {/* CTA buttons */}
        <div className="flex gap-5 justify-center mt-2">
          <Link
            href="/login"
            className="crayon-btn crayon-btn-ghost text-base"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="crayon-btn crayon-btn-red text-base"
          >
            Sign up free 🎨
          </Link>
        </div>
      </div>

    </main>
  );
}
