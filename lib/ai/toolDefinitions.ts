/**
 * AI tool definitions for OpenAI/Anthropic tool calling.
 * Use these when configuring the LLM to call board operations.
 */

export const BOARD_TOOL_DEFINITIONS = [
  {
    name: "createStickyNote",
    description: "Create a sticky note on the board",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text content of the sticky note" },
        x: { type: "number", description: "X position on the board" },
        y: { type: "number", description: "Y position on the board" },
        color: {
          type: "string",
          description: "Hex color (e.g. #fef08a)",
          default: "#fef08a",
        },
      },
      required: ["text", "x", "y"],
    },
  },
  {
    name: "createShape",
    description: "Create a rectangle or circle shape. Optionally add text inside the shape.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["rect", "circle"],
          description: "Shape type",
        },
        x: { type: "number", description: "X position" },
        y: { type: "number", description: "Y position" },
        width: { type: "number", description: "Width (diameter for circle)" },
        height: { type: "number", description: "Height (diameter for circle)" },
        color: {
          type: "string",
          description: "Hex color",
          default: "#3b82f6",
        },
        text: {
          type: "string",
          description: "Optional text to display inside the shape",
        },
      },
      required: ["type", "x", "y", "width", "height"],
    },
  },
  {
    name: "createFrame",
    description: "Create a frame/container on the board",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Frame title" },
        x: { type: "number", description: "X position" },
        y: { type: "number", description: "Y position" },
        width: { type: "number", description: "Frame width", default: 600 },
        height: { type: "number", description: "Frame height", default: 400 },
      },
      required: ["title", "x", "y"],
    },
  },
  {
    name: "createConnector",
    description:
      "Create an arrow/connector line between two objects. Connector is the same as arrow.",
    parameters: {
      type: "object",
      properties: {
        fromId: { type: "string", description: "ID of the source object" },
        toId: { type: "string", description: "ID of the target object" },
        style: {
          type: "string",
          enum: ["line", "arrow", "both"],
          description:
            "line = no arrows, arrow = arrow at end, both = arrows at both ends",
          default: "arrow",
        },
      },
      required: ["fromId", "toId"],
    },
  },
  {
    name: "moveObject",
    description: "Move an object to a new position",
    parameters: {
      type: "object",
      properties: {
        objectId: { type: "string", description: "ID of the object to move" },
        x: { type: "number", description: "New X position" },
        y: { type: "number", description: "New Y position" },
      },
      required: ["objectId", "x", "y"],
    },
  },
  {
    name: "resizeObject",
    description: "Resize an object (rect, circle, sticky, frame)",
    parameters: {
      type: "object",
      properties: {
        objectId: { type: "string", description: "ID of the object" },
        width: { type: "number", description: "New width" },
        height: { type: "number", description: "New height" },
      },
      required: ["objectId", "width", "height"],
    },
  },
  {
    name: "updateText",
    description: "Update the text of a sticky note",
    parameters: {
      type: "object",
      properties: {
        objectId: { type: "string", description: "ID of the sticky note" },
        newText: { type: "string", description: "New text content" },
      },
      required: ["objectId", "newText"],
    },
  },
  {
    name: "changeColor",
    description: "Change the color of an object",
    parameters: {
      type: "object",
      properties: {
        objectId: { type: "string", description: "ID of the object" },
        color: { type: "string", description: "Hex color (e.g. #ef4444)" },
      },
      required: ["objectId", "color"],
    },
  },
  {
    name: "getBoardState",
    description:
      "Get the current board objects for context. Returns id, type, x, y, width, height, text, title, color for each object.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  // Calculator tools
  {
    name: "add",
    description: "Add two or more numbers",
    parameters: {
      type: "object",
      properties: {
        a: { type: "number", description: "First number" },
        b: { type: "number", description: "Second number" },
        rest: {
          type: "array",
          items: { type: "number" },
          description: "Additional numbers to add",
        },
      },
      required: ["a", "b"],
    },
  },
  {
    name: "subtract",
    description: "Subtract b from a, then subtract each additional number in order",
    parameters: {
      type: "object",
      properties: {
        a: { type: "number", description: "First number" },
        b: { type: "number", description: "Second number" },
        rest: {
          type: "array",
          items: { type: "number" },
          description: "Additional numbers to subtract",
        },
      },
      required: ["a", "b"],
    },
  },
  {
    name: "mult",
    description: "Multiply two or more numbers",
    parameters: {
      type: "object",
      properties: {
        a: { type: "number", description: "First number" },
        b: { type: "number", description: "Second number" },
        rest: {
          type: "array",
          items: { type: "number" },
          description: "Additional numbers to multiply",
        },
      },
      required: ["a", "b"],
    },
  },
  {
    name: "div",
    description: "Divide a by b, then divide by each additional number in order",
    parameters: {
      type: "object",
      properties: {
        a: { type: "number", description: "Dividend" },
        b: { type: "number", description: "Divisor" },
        rest: {
          type: "array",
          items: { type: "number" },
          description: "Additional divisors",
        },
      },
      required: ["a", "b"],
    },
  },
] as const;
