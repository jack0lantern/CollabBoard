"use client";

import { useState } from "react";
import Link from "next/link";
import { GoogleIcon } from "@/components/ui/icons/GoogleIcon";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

function isValidRedirect(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export function SignupForm({ redirectTo }: { redirectTo?: string }) {
  const destination = redirectTo && isValidRedirect(redirectTo) ? redirectTo : "/dashboard";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      setError("First name and last name are required.");
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: trimmedFirst,
            last_name: trimmedLast,
            full_name: `${trimmedFirst} ${trimmedLast}`,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("An account with this email already exists.");
        } else if (authError.message.toLowerCase().includes("password")) {
          setError("Password should be at least 6 characters.");
        } else {
          setError(authError.message);
        }
        return;
      }

      router.push(destination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (authError) {
        setError(authError.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign up with Google");
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
        <h1 className="font-sketch text-4xl font-bold" style={{ color: "var(--crayon-green)" }}>
          Join the fun! 🎨
        </h1>
        <p className="text-sm font-semibold text-gray-500 mt-1">Create your free account</p>
      </div>

      <form
        onSubmit={(e) => { void handleSubmit(e); }}
        className="space-y-4"
      >
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="firstName" className="block text-sm font-bold mb-1">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); }}
              required
              className="crayon-input text-sm"
              placeholder="Alex"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="lastName" className="block text-sm font-bold mb-1">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); }}
              required
              className="crayon-input text-sm"
              placeholder="Smith"
            />
          </div>
        </div>
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
            minLength={6}
            className="crayon-input text-sm"
            placeholder="••••••••"
          />
          <p className="text-xs font-semibold text-gray-400 mt-1">At least 6 characters</p>
        </div>
        {error && (
          <div
            className="text-sm font-bold px-4 py-2 rounded-xl"
            style={{ background: "#fff5f5", border: "2px solid var(--crayon-red)", color: "var(--crayon-red)" }}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="crayon-btn crayon-btn-green w-full text-base flex justify-center"
        >
          {loading ? "Creating... 🖍️" : "Create account 🚀"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: "2.5px dashed #ccc" }} />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white font-bold text-gray-400">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { void handleGoogleSignUp(); }}
        disabled={loading}
        className="crayon-btn crayon-btn-ghost w-full text-base flex justify-center gap-2"
      >
        <GoogleIcon />
        Sign up with Google
      </button>

      <p className="text-sm font-semibold text-center">
        Already have an account?{" "}
        <Link
          href={redirectTo && isValidRedirect(redirectTo) ? `/login?next=${encodeURIComponent(redirectTo)}` : "/login"}
          className="font-black underline"
          style={{ color: "var(--crayon-blue)" }}
        >
          Log in!
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
