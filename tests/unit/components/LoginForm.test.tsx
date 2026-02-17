import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
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

const mockSignInWithEmail = vi.fn();
const mockSignInWithPopup = vi.fn();

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({}),
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmail(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  GoogleAuthProvider: vi.fn(),
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
      mockSignInWithEmail.mockResolvedValue({});
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("does NOT redirect to / after successful email sign-in", async () => {
      mockSignInWithEmail.mockResolvedValue({});
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
      expect(mockPush).not.toHaveBeenCalledWith("/");
    });

    it("redirects to /dashboard after successful Google sign-in", async () => {
      mockSignInWithPopup.mockResolvedValue({});
      render(<LoginForm />);

      fireEvent.click(
        screen.getByRole("button", { name: "Sign in with Google" })
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });
  });

  describe("auth/operation-not-allowed error", () => {
    it('shows "User does not exist" message', async () => {
      mockSignInWithEmail.mockRejectedValue({
        code: "auth/operation-not-allowed",
        message: "Firebase: Error (auth/operation-not-allowed).",
      });
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(screen.getByText("User does not exist.")).toBeInTheDocument();
      });
    });

    it('shows a "Create an account?" link to /signup', async () => {
      mockSignInWithEmail.mockRejectedValue({
        code: "auth/operation-not-allowed",
        message: "Firebase: Error (auth/operation-not-allowed).",
      });
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        const link = screen.getByRole("link", { name: "Create an account?" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/signup");
      });
    });

    it("does not show the raw Firebase error string", async () => {
      mockSignInWithEmail.mockRejectedValue({
        code: "auth/operation-not-allowed",
        message: "Firebase: Error (auth/operation-not-allowed).",
      });
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(screen.getByText("User does not exist.")).toBeInTheDocument();
      });
      expect(
        screen.queryByText(/auth\/operation-not-allowed/)
      ).not.toBeInTheDocument();
    });
  });

  describe("auth/invalid-credential error", () => {
    it('shows "Invalid username/password combination" message', async () => {
      mockSignInWithEmail.mockRejectedValue({
        code: "auth/invalid-credential",
        message: "Firebase: Error (auth/invalid-credential).",
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
      mockSignInWithEmail.mockRejectedValue({
        code: "auth/invalid-credential",
        message: "Firebase: Error (auth/invalid-credential).",
      });
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        const link = screen.getByRole("link", { name: "made an account" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/signup");
      });
    });

    it("does not show the raw Firebase error string", async () => {
      mockSignInWithEmail.mockRejectedValue({
        code: "auth/invalid-credential",
        message: "Firebase: Error (auth/invalid-credential).",
      });
      render(<LoginForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(
          screen.getByText(/Invalid username\/password combination/)
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByText(/auth\/invalid-credential/)
      ).not.toBeInTheDocument();
    });
  });

  describe("Google sign-in errors", () => {
    it("shows friendly message for auth/operation-not-allowed via Google", async () => {
      mockSignInWithPopup.mockRejectedValue({
        code: "auth/operation-not-allowed",
      });
      render(<LoginForm />);

      fireEvent.click(
        screen.getByRole("button", { name: "Sign in with Google" })
      );

      await waitFor(() => {
        expect(screen.getByText("User does not exist.")).toBeInTheDocument();
        expect(
          screen.getByRole("link", { name: "Create an account?" })
        ).toHaveAttribute("href", "/signup");
      });
    });

    it("shows friendly message for auth/invalid-credential via Google", async () => {
      mockSignInWithPopup.mockRejectedValue({
        code: "auth/invalid-credential",
      });
      render(<LoginForm />);

      fireEvent.click(
        screen.getByRole("button", { name: "Sign in with Google" })
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Invalid username\/password combination/)
        ).toBeInTheDocument();
        expect(
          screen.getByRole("link", { name: "made an account" })
        ).toHaveAttribute("href", "/signup");
      });
    });
  });
});
