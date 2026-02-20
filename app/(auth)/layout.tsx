export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen paper-bg flex flex-col items-center justify-center p-4 relative">
      {/* Decorative blobs */}
      <div
        className="absolute top-16 left-10 w-14 h-14 rounded-full opacity-20 pointer-events-none"
        style={{ background: "var(--crayon-yellow)" }}
      />
      <div
        className="absolute bottom-20 right-12 w-16 h-16 rounded-full opacity-20 pointer-events-none"
        style={{ background: "var(--crayon-pink)" }}
      />
      <div
        className="absolute top-1/3 right-8 w-8 h-8 rotate-45 opacity-15 pointer-events-none"
        style={{ background: "var(--crayon-green)" }}
      />

      <div className="w-full max-w-md z-10">{children}</div>
    </div>
  );
}
