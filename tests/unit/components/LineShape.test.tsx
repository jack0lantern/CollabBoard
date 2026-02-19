import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

const mockUpdateObject = vi.fn();

vi.mock("@/hooks/useBoardMutations", () => ({
  useBoardMutations: () => ({ updateObject: mockUpdateObject }),
}));

const fakeKonvaNode = { _konva: true };

vi.mock("react-konva", () => {
  const React = require("react");
  const Group = React.forwardRef(
    (props: Record<string, unknown> & { children?: unknown }, ref: React.Ref<unknown>) => {
      React.useLayoutEffect(() => {
        if (typeof ref === "function") {
          ref(fakeKonvaNode);
        } else if (ref && typeof ref === "object") {
          (ref as React.MutableRefObject<unknown>).current = fakeKonvaNode;
        }
        return () => {
          if (typeof ref === "function") {
            ref(null);
          } else if (ref && typeof ref === "object") {
            (ref as React.MutableRefObject<unknown>).current = null;
          }
        };
      });
      return React.createElement("div", { "data-testid": "group" }, props.children);
    }
  );
  return {
    Group,
    Line: () => React.createElement("div", { "data-testid": "line" }),
    Arrow: () => React.createElement("div", { "data-testid": "arrow" }),
    Circle: () => React.createElement("div", { "data-testid": "circle" }),
    Fragment: React.Fragment,
  };
});

const { LineShape } = await import("@/components/canvas/shapes/LineShape");

const baseLineData = {
  id: "l1",
  type: "line" as const,
  x: 0,
  y: 0,
  points: [0, 0, 100, 80],
};

describe("LineShape registerShapeRef (line flickering)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unregisters shape ref when isSelected becomes false to prevent flickering", () => {
    const registerShapeRef = vi.fn();

    const { rerender } = render(
      <LineShape
        data={baseLineData}
        onSelect={() => {}}
        isSelected={true}
        isMultiSelect={false}
        registerShapeRef={registerShapeRef}
      />
    );

    // When selected, should register the node
    expect(registerShapeRef).toHaveBeenCalledWith("l1", expect.anything());
    expect(registerShapeRef).not.toHaveBeenCalledWith("l1", null);

    registerShapeRef.mockClear();

    // Deselect the line
    rerender(
      <LineShape
        data={baseLineData}
        onSelect={() => {}}
        isSelected={false}
        isMultiSelect={false}
        registerShapeRef={registerShapeRef}
      />
    );

    // Must unregister when deselected to prevent line flickering
    expect(registerShapeRef).toHaveBeenCalledWith("l1", null);
  });
});
