"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase not configured");
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/operation-not-allowed") setError("user-not-found");
      else if (code === "auth/invalid-credential") setError("invalid-credential");
      else setError((err as Error)?.message ?? "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase not configured");
      setLoading(false);
      return;
    }

    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/operation-not-allowed") setError("user-not-found");
      else if (code === "auth/invalid-credential") setError("invalid-credential");
      else setError((err as Error)?.message ?? "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Log in</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error === "user-not-found" ? (
              <>
                User does not exist.{" "}
                <Link href="/signup" className="text-blue-600 hover:underline">
                  Create an account?
                </Link>
              </>
            ) : error === "invalid-credential" ? (
              <>
                Invalid username/password combination. Have you{" "}
                <Link href="/signup" className="text-blue-600 hover:underline">
                  made an account
                </Link>
                {" "}yet?
              </>
            ) : (
              error
            )}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
            or
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
      >
        Sign in with Google
      </button>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>

      <Link href="/" className="block text-blue-600 hover:underline">
        ← Back
      </Link>
    </div>
  );
}
