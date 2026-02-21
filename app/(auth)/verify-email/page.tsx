import Link from "next/link";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next;

  return (
    <div
      className="bg-white rounded-2xl p-8 space-y-6"
      style={{
        border: "3px solid #1a1a2e",
        boxShadow: "6px 6px 0 #1a1a2e",
        filter: "url(#hand-drawn)",
      }}
    >
      <div className="text-center space-y-2">
        <h1
          className="font-sketch text-4xl font-bold"
          style={{ color: "var(--crayon-blue)" }}
        >
          Check your email ✉️
        </h1>
        <p className="text-sm font-semibold text-gray-500">
          We sent you a confirmation link. Click it to verify your account and
          get started.
        </p>
      </div>

      <p className="text-sm text-gray-600 text-center">
        Didn&apos;t receive the email? Check your spam folder or{" "}
        <Link
          href="/signup"
          className="font-bold underline"
          style={{ color: "var(--crayon-blue)" }}
        >
          try again
        </Link>
        .
      </p>

      <div className="flex flex-col gap-2">
        {next && next.startsWith("/") && !next.startsWith("//") && (
          <p className="text-xs text-gray-500 text-center">
            After verifying, you&apos;ll be taken to your destination.
          </p>
        )}
        <Link
          href="/"
          className="block text-sm font-bold text-center"
          style={{ color: "var(--crayon-blue)" }}
        >
          ← Back home
        </Link>
      </div>
    </div>
  );
}
