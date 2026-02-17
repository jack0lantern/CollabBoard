import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "@/components/ui/Toolbar";

const mockAddObject = vi.fn();

vi.mock("@/hooks/useBoardMutations", () => ({
  useBoardMutations: () => ({ addObject: mockAddObject }),
}));

vi.mock("@/hooks/useBoardObjects", () => ({
  useBoardObjects: () => ({ objects: {} }),
}));

describe("Toolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expands shape options when the shapes icon is clicked", () => {
    render(<Toolbar />);

    const shapesButton = screen.getByRole("button", { name: "Add shapes" });
    expect(shapesButton).toBeInTheDocument();

    // Shape options should not be visible initially
    expect(screen.queryByRole("button", { name: "Add sticky note" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add rectangle" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add circle" })).not.toBeInTheDocument();

    // Click the shapes icon to expand
    fireEvent.click(shapesButton);

    // Shape options should now be visible
    expect(screen.getByRole("button", { name: "Add sticky note" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add rectangle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add circle" })).toBeInTheDocument();
  });

  it("collapses shape options when clicking the shapes icon again", () => {
    render(<Toolbar />);

    const shapesButton = screen.getByRole("button", { name: "Add shapes" });
    fireEvent.click(shapesButton);

    expect(screen.getByRole("button", { name: "Add sticky note" })).toBeInTheDocument();

    fireEvent.click(shapesButton);

    expect(screen.queryByRole("button", { name: "Add sticky note" })).not.toBeInTheDocument();
  });

  it("dropdown is portaled outside overflow container so it remains visible", () => {
    const overflowContainer = document.createElement("div");
    overflowContainer.setAttribute("data-testid", "overflow-container");
    overflowContainer.style.overflow = "hidden";
    overflowContainer.style.width = "48px";
    document.body.appendChild(overflowContainer);

    const { unmount } = render(<Toolbar />, {
      container: overflowContainer,
    });

    const shapesButton = screen.getByRole("button", { name: "Add shapes" });
    fireEvent.click(shapesButton);

    const stickyButton = screen.getByRole("button", { name: "Add sticky note" });
    // Dropdown must NOT be inside the overflow container (would be clipped in real browser)
    expect(overflowContainer.contains(stickyButton)).toBe(false);

    unmount();
    document.body.removeChild(overflowContainer);
  });
});
