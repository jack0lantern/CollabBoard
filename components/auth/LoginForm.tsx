"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

function isValidRedirect(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const destination = redirectTo && isValidRedirect(redirectTo) ? redirectTo : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseClient();
    if (!supabase) {
      setError("Supabase not configured");
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message === "Invalid login credentials") {
          setError("invalid-credential");
        } else {
          setError(authError.message);
        }
        return;
      }

      router.push(destination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    const supabase = createSupabaseClient();
    if (!supabase) {
      setError("Supabase not configured");
      setLoading(false);
      return;
    }

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      if (redirectTo && isValidRedirect(redirectTo)) {
        callbackUrl.searchParams.set("next", redirectTo);
      }
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (authError) {
        setError(authError.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="bg-white rounded-2xl p-8 space-y-6"
      style={{ border: "3px solid #1a1a2e", boxShadow: "6px 6px 0 #1a1a2e", filter: "url(#hand-drawn)" }}
    >
      <div className="text-center">
        <h1 className="font-sketch text-4xl font-bold" style={{ color: "var(--crayon-blue)" }}>
          Welcome back! ✏️
        </h1>
        <p className="text-sm font-semibold text-gray-500 mt-1">Log in to your boards</p>
      </div>

      <form
        onSubmit={(e) => { void handleSubmit(e); }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-bold mb-1">
            Email 📧
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            required
            className="crayon-input text-sm"
            placeholder="you@school.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-bold mb-1">
            Password 🔑
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            required
            className="crayon-input text-sm"
            placeholder="••••••••"
          />
        </div>
        {error && (
          <div
            className="text-sm font-bold px-4 py-2 rounded-xl"
            style={{ background: "#fff5f5", border: "2px solid var(--crayon-red)", color: "var(--crayon-red)" }}
          >
            {error === "invalid-credential" ? (
              <>
                Wrong password or email. Have you{" "}
                <Link
                  href={redirectTo && isValidRedirect(redirectTo) ? `/signup?next=${encodeURIComponent(redirectTo)}` : "/signup"}
                  className="underline font-black"
                >
                  made an account
                </Link>
                {" "}yet?
              </>
            ) : (
              error
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="crayon-btn crayon-btn-blue w-full text-base justify-center flex"
        >
          {loading ? "Signing in... 🖍️" : "Sign in 🎨"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div
            className="w-full"
            style={{ borderTop: "2.5px dashed #ccc" }}
          />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white font-bold text-gray-400">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { void handleGoogleSignIn(); }}
        disabled={loading}
        className="crayon-btn crayon-btn-ghost w-full text-base flex justify-center gap-2"
      >
        🌐 Sign in with Google
      </button>

      <p className="text-sm font-semibold text-center">
        No account?{" "}
        <Link
          href={redirectTo && isValidRedirect(redirectTo) ? `/signup?next=${encodeURIComponent(redirectTo)}` : "/signup"}
          className="font-black underline"
          style={{ color: "var(--crayon-purple)" }}
        >
          Sign up!
        </Link>
      </p>

      <Link
        href="/"
        className="block text-sm font-bold text-center"
        style={{ color: "var(--crayon-blue)" }}
      >
        ← Back home
      </Link>
    </div>
  );
}
