import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import React from "react";

const mockUpdateObject = vi.fn();
const mockDeleteObject = vi.fn();

vi.mock("@/hooks/useBoardMutations", () => ({
  useBoardMutations: () => ({
    updateObject: mockUpdateObject,
    deleteObject: mockDeleteObject,
  }),
}));

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

let mockGroupProps: any = {};

vi.mock("react-konva", () => {
  const React = require("react");
  return {
    Group: React.forwardRef((props: any, ref: any) => {
      mockGroupProps = props;
      return <div data-testid="group" onClick={(e) => {
        if (props.onClick) props.onClick(fakeKonvaEvent("click"));
      }} onMouseDown={(e) => {
        if (props.onMouseDown) props.onMouseDown(fakeKonvaEvent("mousedown"));
      }} onDragStart={(e) => {
        if (props.onDragStart) props.onDragStart(fakeKonvaEvent("dragstart"));
      }} onDragMove={(e) => {
        if (props.onDragMove) props.onDragMove(fakeKonvaEvent("dragmove"));
      }}>{props.children}</div>;
    }),
    Rect: (props: any) => <div data-testid="rect" {...props} />,
    Text: (props: any) => <div data-testid="text" {...props} />,
    Transformer: (props: any) => <div data-testid="transformer" {...props} />,
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
    mockGroupProps = {};
  });

  it("selects when clicked and only enters edit mode on second click", () => {
    const onSelect = vi.fn();
    
    // Initial render: not selected
    const { rerender } = render(
      <TextShape data={baseData} onSelect={onSelect} isSelected={false} />
    );

    // Mousedown (simulates first click to select)
    act(() => { mockGroupProps.onMouseDown(fakeKonvaEvent("mousedown")); });
    expect(onSelect).toHaveBeenCalledWith("t1", false);

    // Click completes (should not enter edit mode because it wasn't selected before mousedown)
    act(() => { mockGroupProps.onClick(fakeKonvaEvent("click")); });
    
    // Verify no textarea created (not in edit mode)
    expect(document.querySelector("textarea")).toBeNull();

    // Rerender as selected
    rerender(<TextShape data={baseData} onSelect={onSelect} isSelected={true} />);

    // Second click (mousedown then click)
    act(() => { mockGroupProps.onMouseDown(fakeKonvaEvent("mousedown")); });
    act(() => { mockGroupProps.onClick(fakeKonvaEvent("click")); });

    // Should enter edit mode and create a textarea
    const textarea = document.querySelector("textarea");
    expect(textarea).not.toBeNull();
    
    // Cleanup
    textarea?.parentNode?.removeChild(textarea);
  });

  it("has a transparent background rect to make the whole box clickable", () => {
    const { getByTestId, getAllByTestId } = render(
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
