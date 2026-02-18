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
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

import { SignupForm } from "@/components/auth/SignupForm";

function fillAndSubmit(
  firstName = "Test",
  lastName = "User",
  email = "test@example.com",
  password = "password123"
) {
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: firstName },
  });
  fireEvent.change(screen.getByLabelText("Last name"), {
    target: { value: lastName },
  });
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
        data: { user: { id: "abc123" }, session: {} },
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
        data: { user: { id: "abc123" }, session: {} },
        error: null,
      });
      render(<SignupForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
      expect(mockPush).not.toHaveBeenCalledWith("/");
    });

    it("calls signInWithOAuth for Google signup", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: "https://google.com/oauth" },
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

  describe("error handling", () => {
    it("shows error when email already in use", async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      });
      render(<SignupForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(
          screen.getByText("An account with this email already exists.")
        ).toBeInTheDocument();
      });
    });
  });
});
