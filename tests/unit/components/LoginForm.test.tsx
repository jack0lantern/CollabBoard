import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseClient: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) =>
        mockSignInWithPassword(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
  }),
}));

import { LoginForm } from "@/components/auth/LoginForm";

function fillAndSubmit(email = "test@example.com", password = "password123") {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("post-auth redirect", () => {
    it("redirects to /dashboard after successful email sign-in", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("does NOT redirect to / after successful email sign-in", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
      expect(mockPush).not.toHaveBeenCalledWith("/");
    });

    it("calls signInWithOAuth with Google provider for Google sign-in", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: "https://accounts.google.com/oauth" },
        error: null,
      });
      render(<LoginForm />);

      fireEvent.click(
        screen.getByRole("button", { name: "Sign in with Google" })
      );

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({ provider: "google" })
        );
      });
    });
  });

  describe("invalid-credential error", () => {
    it('shows "Invalid username/password combination" message', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: "Invalid login credentials" },
      });
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(
          screen.getByText(/Invalid username\/password combination/)
        ).toBeInTheDocument();
      });
    });

    it('shows a "made an account" link to /signup', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: "Invalid login credentials" },
      });
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        const link = screen.getByRole("link", { name: "made an account" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/signup");
      });
    });
  });

});
