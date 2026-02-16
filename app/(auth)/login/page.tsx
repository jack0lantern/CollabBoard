import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Auth integration: Add Supabase Auth or NextAuth here.
      </p>
      <Link href="/" className="text-blue-600 hover:underline">
        ← Back
      </Link>
    </div>
  );
}
