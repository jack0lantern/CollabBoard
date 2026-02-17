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

const mockSignUp = vi.fn();
const mockSignInWithOAuth = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseClient: () => ({
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
  }),
}));

import { SignupForm } from "@/components/auth/SignupForm";

function fillAndSubmit(
  email = "test@example.com",
  password = "password123"
) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SignupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("post-auth redirect", () => {
    it("redirects to /dashboard after successful email signup", async () => {
      mockSignUp.mockResolvedValue({
        data: { session: { user: {} } },
        error: null,
      });
      render(<SignupForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("does NOT redirect to / after successful email signup", async () => {
      mockSignUp.mockResolvedValue({
        data: { session: { user: {} } },
        error: null,
      });
      render(<SignupForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
      expect(mockPush).not.toHaveBeenCalledWith("/");
    });

    it("calls signInWithOAuth with Google provider for Google signup", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: "https://accounts.google.com/oauth" },
        error: null,
      });
      render(<SignupForm />);

      fireEvent.click(
        screen.getByRole("button", { name: "Sign up with Google" })
      );

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({ provider: "google" })
        );
      });
    });
  });

  describe("email confirmation", () => {
    it("shows success message when email confirmation is required", async () => {
      mockSignUp.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      render(<SignupForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(
          screen.getByText("Check your email for the confirmation link.")
        ).toBeInTheDocument();
      });
    });
  });
});
