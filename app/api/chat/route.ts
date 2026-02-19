import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, tool, type UIMessage } from "ai";
import { z } from "zod";
import { trace } from "@opentelemetry/api";
import { startActiveObservation } from "@langfuse/tracing";
import { langfuseSpanProcessor } from "@/instrumentation";
import { executeCalculatorTool } from "@/lib/ai/calculator";

export const maxDuration = 30;

const handler = async (
  req: Request,
  span: { update: (a: object) => void; updateTrace: (a: object) => void }
) => {
  const { messages, boardState } = (await req.json()) as {
    messages: UIMessage[];
    boardState?: Array<{
      id: string;
      type: string;
      x: number;
      y: number;
      text?: string;
      title?: string;
    }>;
  };

  const systemPrompt = `You are an AI assistant for a collaborative whiteboard. You can create and modify shapes, sticky notes, frames, and connectors on the board. If the user doesn't give you parameters, use defaults.

**Scope & guard rails:**
- Only respond to requests related to the whiteboard: creating/editing shapes, sticky notes, frames, connectors, moving or resizing objects, changing colors or text, or arithmetic that supports those tasks.
- If the user asks something off-topic (e.g., general knowledge, coding help, creative writing, personal advice, or anything unrelated to the board), politely redirect: "I'm here to help with your whiteboard—adding shapes, sticky notes, frames, and connectors. What would you like to create or change on the board?"
- Do NOT use any tools for off-topic requests. Do NOT answer unrelated questions.
- Keep responses concise and focused on board actions.

**Important: For any arithmetic or math calculations, you MUST use the calculator tools (add, subtract, mult, div). Do NOT compute numbers yourself—always call the appropriate calculator tool.**

Current board state (for context):
${JSON.stringify(boardState ?? [], null, 2)}

When the user asks you to add or change something, use the appropriate tool. For positions (x, y), use reasonable values (e.g. 100–500). For colors, use hex codes like #fef08a, #3b82f6, #ef4444.`;

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const inputText = lastUserMessage
    ? lastUserMessage.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ")
    : "";

  span.update({ input: inputText });
  span.updateTrace({
    name: "chat-whiteboard",
    input: inputText,
  });

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    experimental_telemetry: { isEnabled: true },
    onFinish: async (finishResult) => {
      span.update({ output: finishResult.text });
      span.updateTrace({ output: finishResult.text });
      trace.getActiveSpan()?.end();
      await langfuseSpanProcessor.forceFlush();
    },
    onError: async (error) => {
      const errorOutput =
        error instanceof Error ? error.message : JSON.stringify(error);
      span.update({ output: errorOutput, level: "ERROR" });
      span.updateTrace({ output: errorOutput });
      trace.getActiveSpan()?.end();
      await langfuseSpanProcessor.forceFlush();
    },
    tools: {
      createStickyNote: tool({
        description: "Create a sticky note on the board",
        inputSchema: z.object({
          text: z.string().describe("The text content"),
          x: z.number().describe("X position"),
          y: z.number().describe("Y position"),
          color: z.string().default("#fef08a").describe("Hex color"),
        }),
      }),
      createShape: tool({
        description: "Create a rectangle or circle",
        inputSchema: z.object({
          type: z.enum(["rect", "circle"]),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          color: z.string().default("#3b82f6"),
        }),
      }),
      createFrame: tool({
        description: "Create a frame/container",
        inputSchema: z.object({
          title: z.string(),
          x: z.number(),
          y: z.number(),
          width: z.number().default(600),
          height: z.number().default(400),
        }),
      }),
      createConnector: tool({
        description: "Create an arrow/connector between two objects",
        inputSchema: z.object({
          fromId: z.string().describe("Source object ID"),
          toId: z.string().describe("Target object ID"),
          style: z.enum(["line", "arrow", "both"]).default("arrow"),
        }),
      }),
      moveObject: tool({
        description: "Move an object to a new position",
        inputSchema: z.object({
          objectId: z.string(),
          x: z.number(),
          y: z.number(),
        }),
      }),
      resizeObject: tool({
        description: "Resize an object",
        inputSchema: z.object({
          objectId: z.string(),
          width: z.number(),
          height: z.number(),
        }),
      }),
      updateText: tool({
        description: "Update text of a sticky note",
        inputSchema: z.object({
          objectId: z.string(),
          newText: z.string(),
        }),
      }),
      changeColor: tool({
        description: "Change object color",
        inputSchema: z.object({
          objectId: z.string(),
          color: z.string(),
        }),
      }),
      getBoardState: tool({
        description: "Get current board objects for context",
        inputSchema: z.object({}),
      }),
      add: tool({
        description: "Add two or more numbers. Use for any addition.",
        inputSchema: z.object({
          a: z.number(),
          b: z.number(),
          rest: z.array(z.number()).optional().describe("Additional numbers to add"),
        }),
        execute: ({ a, b, rest = [] }: { a: number; b: number; rest?: number[] }) =>
          Promise.resolve(executeCalculatorTool("add", { a, b, rest })),
      }),
      subtract: tool({
        description: "Subtract b from a, then subtract each additional number in order.",
        inputSchema: z.object({
          a: z.number(),
          b: z.number(),
          rest: z.array(z.number()).optional(),
        }),
        execute: ({ a, b, rest = [] }: { a: number; b: number; rest?: number[] }) =>
          Promise.resolve(executeCalculatorTool("subtract", { a, b, rest })),
      }),
      mult: tool({
        description: "Multiply two or more numbers.",
        inputSchema: z.object({
          a: z.number(),
          b: z.number(),
          rest: z.array(z.number()).optional(),
        }),
        execute: ({ a, b, rest = [] }: { a: number; b: number; rest?: number[] }) =>
          Promise.resolve(executeCalculatorTool("mult", { a, b, rest })),
      }),
      div: tool({
        description: "Divide a by b, then divide by each additional number in order.",
        inputSchema: z.object({
          a: z.number(),
          b: z.number(),
          rest: z.array(z.number()).optional(),
        }),
        execute: ({ a, b, rest = [] }: { a: number; b: number; rest?: number[] }) =>
          Promise.resolve(executeCalculatorTool("div", { a, b, rest })),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
};

export const POST = async (req: Request) =>
  startActiveObservation("handle-chat-message", (span) => handler(req, span), {
    endOnExit: false,
  });
