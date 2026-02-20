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
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

import { LoginForm } from "@/components/auth/LoginForm";

function fillAndSubmit(email = "test@example.com", password = "password123") {
  fireEvent.change(screen.getByLabelText(/Email/), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/Password/), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Sign in(?! with)/ }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("post-auth redirect", () => {
    it("redirects to /dashboard after successful email sign-in", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: {}, session: {} },
        error: null,
      });
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("does NOT redirect to / after successful email sign-in", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: {}, session: {} },
        error: null,
      });
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
      expect(mockPush).not.toHaveBeenCalledWith("/");
    });

    it("calls signInWithOAuth for Google sign-in", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: "https://google.com/oauth" },
        error: null,
      });
      render(<LoginForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /Sign in with Google/ })
      );

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({ provider: "google" })
        );
      });
    });

    it("redirects to redirectTo after successful email sign-in when provided", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: {}, session: {} },
        error: null,
      });
      render(<LoginForm redirectTo="/board/abc123" />);

      fireEvent.change(screen.getByLabelText(/Email/), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Password/), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^Sign in(?! with)/ }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/board/abc123");
      });
    });

    it("includes next param in OAuth redirectTo when redirectTo is provided", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: "https://google.com/oauth" },
        error: null,
      });
      render(<LoginForm redirectTo="/board/xyz" />);

      fireEvent.click(
        screen.getByRole("button", { name: /Sign in with Google/ })
      );

      await waitFor(() => {
        const redirectTo = mockSignInWithOAuth.mock.calls[0][0].options.redirectTo;
        expect(redirectTo).toContain("/auth/callback");
        expect(redirectTo).toContain("next=%2Fboard%2Fxyz");
      });
    });
  });

  describe("invalid-credential error", () => {
    it('shows invalid credential error with "made an account" link', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(
          screen.getByText(/Wrong password or email/)
        ).toBeInTheDocument();
      });
    });

    it('shows a "made an account" link to /signup', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
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
