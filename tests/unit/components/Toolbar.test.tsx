import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "@/components/ui/Toolbar";

const mockAddObject = vi.fn();

vi.mock("@/hooks/useBoardMutations", () => ({
  useBoardMutations: () => ({ addObject: mockAddObject }),
}));

vi.mock("@/hooks/useBoardObjects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useBoardObjects")>();
  return {
    ...actual,
    useBoardObjectsContext: () => ({ objects: {} }),
  };
});

describe("Toolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows sticky note button directly on toolbar", () => {
    render(<Toolbar />);

    const stickyButton = screen.getByRole("button", { name: "Add sticky note" });
    expect(stickyButton).toBeInTheDocument();
  });

  it("expands shape options when the shapes icon is clicked", () => {
    render(<Toolbar />);

    const shapesButton = screen.getByRole("button", { name: "Add shapes" });
    expect(shapesButton).toBeInTheDocument();

    // Shape dropdown options should not be visible initially
    expect(screen.queryByRole("button", { name: "Add rectangle" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add circle" })).not.toBeInTheDocument();

    // Click the shapes icon to expand
    fireEvent.click(shapesButton);

    // Shape options should now be visible
    expect(screen.getByRole("button", { name: "Add rectangle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add circle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add line" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add arrow" })).toBeInTheDocument();
  });

  it("adds arrow with arrowEnd when Add arrow is clicked", () => {
    render(<Toolbar />);

    const shapesButton = screen.getByRole("button", { name: "Add shapes" });
    fireEvent.click(shapesButton);

    const arrowButton = screen.getByRole("button", { name: "Add arrow" });
    fireEvent.click(arrowButton);

    expect(mockAddObject).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "line",
        arrowEnd: true,
        points: [0, 0, 100, 80],
      })
    );
  });

  it("collapses shape options when clicking the shapes icon again", () => {
    render(<Toolbar />);

    const shapesButton = screen.getByRole("button", { name: "Add shapes" });
    fireEvent.click(shapesButton);

    expect(screen.getByRole("button", { name: "Add rectangle" })).toBeInTheDocument();

    fireEvent.click(shapesButton);

    expect(screen.queryByRole("button", { name: "Add rectangle" })).not.toBeInTheDocument();
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

    const rectButton = screen.getByRole("button", { name: "Add rectangle" });
    // Dropdown must NOT be inside the overflow container (would be clipped in real browser)
    expect(overflowContainer.contains(rectButton)).toBe(false);

    unmount();
    document.body.removeChild(overflowContainer);
  });
});
