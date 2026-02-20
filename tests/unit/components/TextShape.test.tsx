import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, fireEvent } from "@testing-library/react";
import React from "react";

const mockUpdateObject = vi.fn();
const mockDeleteObject = vi.fn();

vi.mock("@/hooks/useBoardMutations", () => ({
  useBoardMutations: () => ({
    updateObject: mockUpdateObject,
    deleteObject: mockDeleteObject,
  }),
}));

vi.mock("react-konva", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- vi.mock factory runs before imports
  const React = require("react");

  type GroupProps = Record<string, unknown> & { children?: React.ReactNode };
  type KonvaComponentProps = Record<string, unknown>;

  const fakeStage = {
    container: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0 }) }),
    scaleX: () => 1,
    scaleY: () => 1,
    x: () => 0,
    y: () => 0,
  };

  const fakeKonvaEvent = (type: string, clientX = 0, clientY = 0) => ({
    evt: { button: 0, clientX, clientY, preventDefault: vi.fn(), shiftKey: false },
    cancelBubble: false,
    target: {
      getStage: () => fakeStage,
      x: () => 10,
      y: () => 20,
    },
  });

  const Group = React.forwardRef<unknown, GroupProps>((props, _ref) => (
    <div
      data-testid="group"
      onClick={() => {
        if (props.onClick) (props.onClick as (e: unknown) => void)(fakeKonvaEvent("click"));
      }}
      onMouseDown={() => {
        if (props.onMouseDown) (props.onMouseDown as (e: unknown) => void)(fakeKonvaEvent("mousedown"));
      }}
      onDragStart={() => {
        if (props.onDragStart) (props.onDragStart as (e: unknown) => void)(fakeKonvaEvent("dragstart"));
      }}
      onDragMove={() => {
        if (props.onDragMove) (props.onDragMove as (e: unknown) => void)(fakeKonvaEvent("dragmove"));
      }}
    >
      {props.children}
    </div>
  ));
  Group.displayName = "Group";
  return {
    Group,
    Rect: (props: KonvaComponentProps) => <div data-testid="rect" {...props} />,
    Text: (props: KonvaComponentProps) => <div data-testid="text" {...props} />,
    Transformer: (props: KonvaComponentProps) => <div data-testid="transformer" {...props} />,
  };
});

vi.mock("@/lib/utils/measureText", () => ({
  measureText: () => ({ width: 100, height: 20 }),
  getCaretIndexFromPosition: () => 0,
}));

const { TextShape } = await import("@/components/canvas/shapes/TextShape");

const baseData = {
  id: "t1",
  type: "text" as const,
  x: 100,
  y: 100,
  width: 200,
  height: 50,
  text: "Hello",
};

describe("TextShape Interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selects when clicked and only enters edit mode on second click", () => {
    const onSelect = vi.fn();

    // Initial render: not selected
    const { getByTestId, rerender } = render(
      <TextShape data={baseData} onSelect={onSelect} isSelected={false} />
    );

    const group = getByTestId("group");

    // Mousedown (simulates first click to select)
    act(() => {
      fireEvent.mouseDown(group);
    });
    expect(onSelect).toHaveBeenCalledWith("t1", false);

    // Click completes (should not enter edit mode because it wasn't selected before mousedown)
    act(() => {
      fireEvent.click(group);
    });

    // Verify no textarea created (not in edit mode)
    expect(document.querySelector("textarea")).toBeNull();

    // Rerender as selected
    rerender(<TextShape data={baseData} onSelect={onSelect} isSelected={true} />);

    const groupAfterRerender = getByTestId("group");

    // Second click (mousedown then click)
    act(() => {
      fireEvent.mouseDown(groupAfterRerender);
    });
    act(() => {
      fireEvent.click(groupAfterRerender);
    });

    // Should enter edit mode and create a textarea
    const textarea = document.querySelector("textarea");
    expect(textarea).not.toBeNull();

    // Cleanup
    textarea?.parentNode?.removeChild(textarea);
  });

  it("has a transparent background rect to make the whole box clickable", () => {
    const { getAllByTestId } = render(
      <TextShape data={baseData} onSelect={vi.fn()} isSelected={false} />
    );
    
    const rects = getAllByTestId("rect");
    // Should have a transparent background rect
    const bgRect = rects.find(r => r.getAttribute("fill") === "transparent");
    expect(bgRect).toBeTruthy();
    // It must listen to events to be clickable
    expect(bgRect?.getAttribute("listening")).not.toBe("false");
  });
});
