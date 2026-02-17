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

const mockCreateUser = vi.fn();
const mockSignInWithPopup = vi.fn();

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({}),
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUser(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  GoogleAuthProvider: vi.fn(),
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
      mockCreateUser.mockResolvedValue({});
      render(<SignupForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("does NOT redirect to / after successful email signup", async () => {
      mockCreateUser.mockResolvedValue({});
      render(<SignupForm />);

      fillAndSubmit();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
      expect(mockPush).not.toHaveBeenCalledWith("/");
    });

    it("redirects to /dashboard after successful Google signup", async () => {
      mockSignInWithPopup.mockResolvedValue({});
      render(<SignupForm />);

      fireEvent.click(
        screen.getByRole("button", { name: "Sign up with Google" })
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("does NOT redirect to / after successful Google signup", async () => {
      mockSignInWithPopup.mockResolvedValue({});
      render(<SignupForm />);

      fireEvent.click(
        screen.getByRole("button", { name: "Sign up with Google" })
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
      expect(mockPush).not.toHaveBeenCalledWith("/");
    });
  });
});
