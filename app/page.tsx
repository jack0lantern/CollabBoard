import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">CollabBoard</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Real-time collaborative whiteboard
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-90"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
