import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

const mockUpdateObject = vi.fn();

vi.mock("@/hooks/useBoardMutations", () => ({
  useBoardMutations: () => ({ updateObject: mockUpdateObject }),
}));

// Capture props passed to Konva primitives - must be in vi.mock factory (hoisted)
vi.mock("react-konva", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- vi.mock factory runs before imports
  const React = require("react");
  const captured = {
    Rect: null as Record<string, unknown> | null,
    Ellipse: null as Record<string, unknown> | null,
    Group: null as Record<string, unknown> | null,
  };
  (globalThis as { __shapeRotationCaptured?: typeof captured }).__shapeRotationCaptured =
    captured;
  return {
    Rect: (props: Record<string, unknown>) => {
      captured.Rect = props;
      return React.createElement("div", { "data-testid": "rect" });
    },
    Ellipse: (props: Record<string, unknown>) => {
      captured.Ellipse = props;
      return React.createElement("div", { "data-testid": "ellipse" });
    },
    Group: (() => {
      const Group = React.forwardRef<unknown, Record<string, unknown> & { children?: unknown }>(
        (props, _ref) => {
          captured.Group = props;
          return React.createElement("div", { "data-testid": "group" }, props.children);
        }
      );
      Group.displayName = "Group";
      return Group;
    })(),
    Line: () => React.createElement("div", { "data-testid": "line" }),
    Arrow: () => React.createElement("div", { "data-testid": "arrow" }),
    Circle: () => React.createElement("div", { "data-testid": "circle" }),
    Transformer: () => null,
    Text: () => React.createElement("div", { "data-testid": "text" }),
  };
});

// Import after mocks so react-konva is mocked before shape components load
const { RectShape } = await import("@/components/canvas/shapes/RectShape");
const { CircleShape } = await import("@/components/canvas/shapes/CircleShape");
const { LineShape } = await import("@/components/canvas/shapes/LineShape");

function getCaptured() {
  return (globalThis as { __shapeRotationCaptured?: { Rect?: Record<string, unknown>; Ellipse?: Record<string, unknown>; Group?: Record<string, unknown> } }).__shapeRotationCaptured ?? {};
}

const baseRectData = {
  id: "r1",
  type: "rect" as const,
  x: 100,
  y: 100,
  width: 80,
  height: 60,
};

const baseCircleData = {
  id: "c1",
  type: "circle" as const,
  x: 200,
  y: 200,
  radius: 40,
};

const baseLineData = {
  id: "l1",
  type: "line" as const,
  x: 0,
  y: 0,
  points: [0, 0, 100, 80],
};

describe("shape rotation retention (group selection)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const c = getCaptured();
    c.Rect = null;
    c.Ellipse = null;
    c.Group = null;
  });

  it("RectShape passes rotation to Group when data has rotation (e.g. after group rotate)", () => {
    render(
      <RectShape
        data={{ ...baseRectData, rotation: 45 }}
        onSelect={() => {}}
        isSelected={false}
        isMultiSelect={false}
      />
    );
    expect(getCaptured().Group?.rotation).toBe(45);
  });

  it("CircleShape passes rotation to Group when data has rotation (e.g. after group rotate)", () => {
    render(
      <CircleShape
        data={{ ...baseCircleData, rotation: -30 }}
        onSelect={() => {}}
        isSelected={false}
        isMultiSelect={false}
      />
    );
    expect(getCaptured().Group?.rotation).toBe(-30);
  });

  it("LineShape passes rotation to Group when data has rotation (e.g. after group rotate)", () => {
    render(
      <LineShape
        data={{ ...baseLineData, rotation: 90 }}
        onSelect={() => {}}
        isSelected={false}
        isMultiSelect={false}
      />
    );
    expect(getCaptured().Group?.rotation).toBe(90);
  });

  it("shapes use 0 when rotation is undefined", () => {
    render(
      <RectShape
        data={baseRectData}
        onSelect={() => {}}
        isSelected={false}
        isMultiSelect={false}
      />
    );
    expect(getCaptured().Group?.rotation).toBe(0);
  });
});
