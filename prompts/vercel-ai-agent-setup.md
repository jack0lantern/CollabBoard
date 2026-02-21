# Vercel AI Agent Setup for CollabBoard

This prompt guides you through setting up a Vercel AI SDK chatbot that uses GPT-4o-mini and our board tool methods.

---

## 1. Install Dependencies

```bash
npm install ai @ai-sdk/openai @ai-sdk/react zod
```

- `ai` – Core AI SDK (streamText, tool helpers)
- `@ai-sdk/openai` – OpenAI provider (GPT-4o-mini)
- `@ai-sdk/react` – useChat hook for the chat UI
- `zod` – Schema validation for tool inputs

---

## 2. Environment Variable

Add to `.env.local`:

```
OPENAI_API_KEY=sk-...
```

---

## 3. API Route: `app/api/chat/route.ts`

Create a new route (or replace `app/api/ai/route.ts`). The route defines **client-side tools** (no `execute`). The client will run them via `onToolCall` because they need `useBoardTools` from React context.

```ts
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
import { z } from "zod";
import { executeCalculatorTool } from "@/lib/ai/calculator";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, boardState } = (await req.json()) as {
    messages: unknown;
    boardState?: Array<{ id: string; type: string; x: number; y: number; text?: string; title?: string }>;
  };

  const systemPrompt = `You are an AI assistant for a collaborative whiteboard. You can create and modify shapes, sticky notes, frames, and connectors on the board.

**Scope & guard rails:**
- Only respond to requests related to the whiteboard: creating/editing shapes, sticky notes, frames, connectors, moving or resizing objects, changing colors or text, or arithmetic that supports those tasks.
- If the user asks something off-topic (e.g., general knowledge, coding help, creative writing, personal advice, or anything unrelated to the board), politely redirect: "I'm here to help with your whiteboard—adding shapes, sticky notes, frames, and connectors. What would you like to create or change on the board?"
- Do NOT use any tools for off-topic requests. Do NOT answer unrelated questions.
- Keep responses concise and focused on board actions.

**Important: For any arithmetic or math calculations, you MUST use the calculator tools (add, subtract, mult, div). Do NOT compute numbers yourself—always call the appropriate calculator tool.**

Current board state (for context):
${JSON.stringify(boardState ?? [], null, 2)}

When the user asks you to add or change something, use the appropriate tool. For positions (x, y), use reasonable values (e.g. 100–500). For colors, use hex codes like #fef08a, #3b82f6, #ef4444.`;

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools: {
      createStickyNote: {
        description: "Create a sticky note on the board",
        parameters: z.object({
          text: z.string().describe("The text content"),
          x: z.number().describe("X position"),
          y: z.number().describe("Y position"),
          color: z.string().default("#fef08a").describe("Hex color"),
        }),
      },
      createShape: {
        description: "Create a rectangle or circle",
        parameters: z.object({
          type: z.enum(["rect", "circle"]),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          color: z.string().default("#3b82f6"),
        }),
      },
      createFrame: {
        description: "Create a frame/container",
        parameters: z.object({
          title: z.string(),
          x: z.number(),
          y: z.number(),
          width: z.number().default(600),
          height: z.number().default(400),
        }),
      },
      createConnector: {
        description: "Create an arrow/connector between two objects",
        parameters: z.object({
          fromId: z.string().describe("Source object ID"),
          toId: z.string().describe("Target object ID"),
          style: z.enum(["line", "arrow", "both"]).default("arrow"),
        }),
      },
      moveObject: {
        description: "Move an object to a new position",
        parameters: z.object({
          objectId: z.string(),
          x: z.number(),
          y: z.number(),
        }),
      },
      resizeObject: {
        description: "Resize an object",
        parameters: z.object({
          objectId: z.string(),
          width: z.number(),
          height: z.number(),
        }),
      },
      updateText: {
        description: "Update text of a sticky note",
        parameters: z.object({
          objectId: z.string(),
          newText: z.string(),
        }),
      },
      changeColor: {
        description: "Change object color",
        parameters: z.object({
          objectId: z.string(),
          color: z.string(),
        }),
      },
      getBoardState: {
        description: "Get current board objects for context",
        parameters: z.object({}),
      },
      // Calculator tools (server-side execute) – use these for ALL arithmetic instead of computing yourself
      add: {
        description: "Add two or more numbers. Use for any addition.",
        parameters: z.object({
          a: z.number(),
          b: z.number(),
          rest: z.array(z.number()).optional().describe("Additional numbers to add"),
        }),
        execute: async ({ a, b, rest = [] }) => executeCalculatorTool("add", { a, b, rest }),
      },
      subtract: {
        description: "Subtract b from a, then subtract each additional number in order.",
        parameters: z.object({
          a: z.number(),
          b: z.number(),
          rest: z.array(z.number()).optional(),
        }),
        execute: async ({ a, b, rest = [] }) => executeCalculatorTool("subtract", { a, b, rest }),
      },
      mult: {
        description: "Multiply two or more numbers.",
        parameters: z.object({
          a: z.number(),
          b: z.number(),
          rest: z.array(z.number()).optional(),
        }),
        execute: async ({ a, b, rest = [] }) => executeCalculatorTool("mult", { a, b, rest }),
      },
      div: {
        description: "Divide a by b, then divide by each additional number in order.",
        parameters: z.object({
          a: z.number(),
          b: z.number(),
          rest: z.array(z.number()).optional(),
        }),
        execute: async ({ a, b, rest = [] }) => executeCalculatorTool("div", { a, b, rest }),
      },
    },
  });

  return result.toDataStreamResponse();
}
```

---

## 4. Chat Panel Component

Create `components/chat/ChatPanel.tsx` that uses `useChat` and executes board tools in `onToolCall`:

```tsx
"use client";

import { useChat, DefaultChatTransport } from "@ai-sdk/react";
import { useBoardTools } from "@/hooks/useBoardTools";
import { useCallback } from "react";

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const tools = useBoardTools();

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          boardState: tools.getBoardState(),
        },
      }),
    }),
    onToolCall: useCallback(
      ({ toolCall, addToolOutput }) => {
        if (toolCall.toolName === "createStickyNote") {
          const { text, x, y, color } = toolCall.args as { text: string; x: number; y: number; color?: string };
          const id = tools.createStickyNote(text, x, y, color ?? "#fef08a");
          addToolOutput({ toolCallId: toolCall.toolCallId, result: { id } });
        } else if (toolCall.toolName === "createShape") {
          const { type, x, y, width, height, color } = toolCall.args as { type: "rect" | "circle"; x: number; y: number; width: number; height: number; color?: string };
          const id = tools.createShape(type, x, y, width, height, color ?? "#3b82f6");
          addToolOutput({ toolCallId: toolCall.toolCallId, result: { id } });
        } else if (toolCall.toolName === "createFrame") {
          const { title, x, y, width, height } = toolCall.args as { title: string; x: number; y: number; width?: number; height?: number };
          const id = tools.createFrame(title, x, y, width ?? 600, height ?? 400);
          addToolOutput({ toolCallId: toolCall.toolCallId, result: { id } });
        } else if (toolCall.toolName === "createConnector") {
          const { fromId, toId, style } = toolCall.args as { fromId: string; toId: string; style?: "line" | "arrow" | "both" };
          const id = tools.createConnector(fromId, toId, style ?? "arrow");
          addToolOutput({ toolCallId: toolCall.toolCallId, result: { id } });
        } else if (toolCall.toolName === "moveObject") {
          const { objectId, x, y } = toolCall.args as { objectId: string; x: number; y: number };
          const ok = tools.moveObject(objectId, x, y);
          addToolOutput({ toolCallId: toolCall.toolCallId, result: { success: ok } });
        } else if (toolCall.toolName === "resizeObject") {
          const { objectId, width, height } = toolCall.args as { objectId: string; width: number; height: number };
          const ok = tools.resizeObject(objectId, width, height);
          addToolOutput({ toolCallId: toolCall.toolCallId, result: { success: ok } });
        } else if (toolCall.toolName === "updateText") {
          const { objectId, newText } = toolCall.args as { objectId: string; newText: string };
          const ok = tools.updateText(objectId, newText);
          addToolOutput({ toolCallId: toolCall.toolCallId, result: { success: ok } });
        } else if (toolCall.toolName === "changeColor") {
          const { objectId, color } = toolCall.args as { objectId: string; color: string };
          const ok = tools.changeColor(objectId, color);
          addToolOutput({ toolCallId: toolCall.toolCallId, result: { success: ok } });
        } else if (toolCall.toolName === "getBoardState") {
          const state = tools.getBoardState();
          addToolOutput({ toolCallId: toolCall.toolCallId, result: state });
        }
      },
      [tools]
    ),
  });

  return (
    <div className="flex flex-col w-96 h-[32rem] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center p-3 border-b">
        <h2 className="font-semibold">AI Assistant</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
            <span className="text-xs text-gray-500">{m.role}</span>
            <p className="text-sm">{m.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask to add a sticky note..."
          className="w-full px-3 py-2 rounded border text-sm"
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
```

---

## 5. Wire ChatbotButton to ChatPanel

Update `ChatbotButton` usage so clicking opens the chat panel:

- In the board page, render `ChatPanel` when `open` is true (e.g. as a slide-over or fixed panel in the bottom-right).
- Pass `onClose={() => setOpen(false)}` to `ChatPanel`.
- Ensure `ChatPanel` is inside `BoardObjectsProvider` so `useBoardTools` works.

---

## 6. Sending boardState with Each Request

Use `DefaultChatTransport` with `prepareSendMessagesRequest` to include `boardState` on every request:

```ts
transport: new DefaultChatTransport({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ messages }) => ({
    body: {
      messages,
      boardState: tools.getBoardState(),
    },
  }),
}),
```

This ensures the API receives fresh board context on each message.

---

## 7. Tool Method Reference

### Board tools (client-side, via `useBoardTools`)

| Tool | Method | Notes |
|------|--------|-------|
| createStickyNote | `tools.createStickyNote(text, x, y, color)` | Returns new object ID |
| createShape | `tools.createShape(type, x, y, width, height, color)` | type: "rect" \| "circle" |
| createFrame | `tools.createFrame(title, x, y, width?, height?)` | Defaults 600×400 |
| createConnector | `tools.createConnector(fromId, toId, style?)` | style: "line" \| "arrow" \| "both" |
| moveObject | `tools.moveObject(objectId, x, y)` | Returns boolean |
| resizeObject | `tools.resizeObject(objectId, width, height)` | Returns boolean |
| updateText | `tools.updateText(objectId, newText)` | Sticky notes only |
| changeColor | `tools.changeColor(objectId, color)` | Returns boolean |
| getBoardState | `tools.getBoardState()` | Returns array of objects |

### Calculator tools (server-side, auto-executed)

| Tool | Description |
|------|-------------|
| add | Add two or more numbers. Use for any addition. |
| subtract | Subtract b from a, then each in rest. |
| mult | Multiply two or more numbers. |
| div | Divide a by b, then by each in rest. |

**The LLM must use these calculator tools for all arithmetic—never compute numbers internally.**

---

## 8. API Route Location

- Use `app/api/chat/route.ts` if you want a dedicated chat endpoint.
- Or rename/repurpose `app/api/ai/route.ts` to match the `api` path in `useChat`.

---

## 9. Optional: useChat API Compatibility

If your `useChat` API expects a different shape, adjust the route to match. The Vercel AI SDK `useChat` typically sends `{ messages }` and you can extend the request body to include `boardState` via the `body` option.
