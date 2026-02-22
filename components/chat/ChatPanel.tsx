"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useBoardTools } from "@/hooks/useBoardTools";
import { useViewport } from "@/components/providers/ViewportProvider";
import { getDefaultObjectPosition } from "@/lib/ai/boardTools";
import { useRef, useEffect, useState } from "react";

const USER_FRIENDLY_ERROR = "Something went wrong. Please try again.";

function getDisplayErrorMessage(error: { message?: string }): string {
  const msg = error?.message ?? USER_FRIENDLY_ERROR;
  // Stack traces contain "at " or "at Object." - don't show those to users
  if (/\n\s+at\s/.test(msg) || msg.includes("at Object.")) {
    return USER_FRIENDLY_ERROR;
  }
  // Very long messages are likely full error dumps
  if (msg.length > 200) {
    return USER_FRIENDLY_ERROR;
  }
  return msg;
}

const SUGGESTIONS = [
  "Create a SWOT analysis",
  "Add sticky notes for brainstorming",
  "Build a simple flowchart",
  "Organize ideas into frames",
];

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const tools = useBoardTools();
  const viewport = useViewport();
  const [input, setInput] = useState("");
  const addToolOutputRef = useRef<((args: { tool: string; toolCallId: string; output: unknown }) => void) | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, addToolOutput, stop, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          boardState: tools.getBoardState(),
        },
      }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      const addToolOutputFn = addToolOutputRef.current;
      if (!addToolOutputFn) return;
      if (toolCall.dynamic) return;

      const input = toolCall.input as Record<string, unknown> | undefined;
      if (toolCall.toolName === "createStickyNote") {
        const { text, x, y, color } = (input ?? {}) as {
          text?: string; x?: number; y?: number; color?: string;
        };
        const defaultPos = getDefaultObjectPosition(viewport);
        const id = tools.createStickyNote(
          text ?? "",
          typeof x === "number" ? x : defaultPos.x,
          typeof y === "number" ? y : defaultPos.y,
          color ?? "#fef08a"
        );
        addToolOutputFn({ tool: "createStickyNote", toolCallId: toolCall.toolCallId, output: { id } });
      } else if (toolCall.toolName === "createShape") {
        const { type, x, y, width, height, color, text } = (input ?? {}) as {
          type?: "rect" | "circle"; x?: number; y?: number; width?: number; height?: number; color?: string; text?: string;
        };
        const defaultPos = getDefaultObjectPosition(viewport);
        const id = tools.createShape(
          type === "circle" ? "circle" : "rect",
          typeof x === "number" ? x : defaultPos.x,
          typeof y === "number" ? y : defaultPos.y,
          typeof width === "number" ? width : 100,
          typeof height === "number" ? height : 100,
          color ?? "#3b82f6",
          typeof text === "string" ? text : undefined
        );
        addToolOutputFn({ tool: "createShape", toolCallId: toolCall.toolCallId, output: { id } });
      } else if (toolCall.toolName === "createFrame") {
        const { title, x, y, width, height } = (input ?? {}) as {
          title?: string; x?: number; y?: number; width?: number; height?: number;
        };
        const defaultPos = getDefaultObjectPosition(viewport);
        const id = tools.createFrame(
          title ?? "",
          typeof x === "number" ? x : defaultPos.x,
          typeof y === "number" ? y : defaultPos.y,
          width ?? 600,
          height ?? 400
        );
        addToolOutputFn({ tool: "createFrame", toolCallId: toolCall.toolCallId, output: { id } });
      } else if (toolCall.toolName === "createConnector") {
        const { fromId, toId, style } = (input ?? {}) as {
          fromId: string; toId: string; style?: "line" | "arrow" | "both";
        };
        const id = tools.createConnector(fromId, toId, style ?? "arrow");
        addToolOutputFn({
          tool: "createConnector",
          toolCallId: toolCall.toolCallId,
          output: id != null ? { id } : { id: null, error: "Source or target object not found" },
        });
      } else if (toolCall.toolName === "createStraightLine") {
        const { points, x, y, strokeColor, strokeWidth } = (input ?? {}) as {
          points?: number[];
          x?: number;
          y?: number;
          strokeColor?: string;
          strokeWidth?: number;
        };
        const defaultPos = getDefaultObjectPosition(viewport);
        const id = tools.createStraightLine(
          typeof x === "number" ? x : defaultPos.x,
          typeof y === "number" ? y : defaultPos.y,
          Array.isArray(points) && points.length >= 4 ? points : [0, 0, 50, 50],
          strokeColor ?? "#1a1a2e",
          typeof strokeWidth === "number" ? strokeWidth : 2
        );
        addToolOutputFn({ tool: "createStraightLine", toolCallId: toolCall.toolCallId, output: { id } });
      } else if (toolCall.toolName === "createCurvedStroke") {
        const { points, x, y, strokeColor, strokeWidth } = (input ?? {}) as {
          points?: number[];
          x?: number;
          y?: number;
          strokeColor?: string;
          strokeWidth?: number;
        };
        const defaultPos = getDefaultObjectPosition(viewport);
        const id = tools.createCurvedStroke(
          typeof x === "number" ? x : defaultPos.x,
          typeof y === "number" ? y : defaultPos.y,
          Array.isArray(points) && points.length >= 4 ? points : [0, 0, 50, 50],
          strokeColor ?? "#1a1a2e",
          typeof strokeWidth === "number" ? strokeWidth : 2
        );
        addToolOutputFn({ tool: "createCurvedStroke", toolCallId: toolCall.toolCallId, output: { id } });
      } else if (toolCall.toolName === "moveObject") {
        const { objectId, x, y } = (input ?? {}) as { objectId: string; x: number; y: number };
        const ok = tools.moveObject(objectId, x, y);
        addToolOutputFn({ tool: "moveObject", toolCallId: toolCall.toolCallId, output: { success: ok } });
      } else if (toolCall.toolName === "resizeObject") {
        const { objectId, width, height } = (input ?? {}) as {
          objectId: string; width: number; height: number;
        };
        const ok = tools.resizeObject(objectId, width, height);
        addToolOutputFn({ tool: "resizeObject", toolCallId: toolCall.toolCallId, output: { success: ok } });
      } else if (toolCall.toolName === "updateText") {
        const { objectId, newText } = (input ?? {}) as { objectId: string; newText: string };
        const ok = tools.updateText(objectId, newText);
        addToolOutputFn({ tool: "updateText", toolCallId: toolCall.toolCallId, output: { success: ok } });
      } else if (toolCall.toolName === "changeColor") {
        const { objectId, color } = (input ?? {}) as { objectId: string; color: string };
        const ok = tools.changeColor(objectId, color);
        addToolOutputFn({ tool: "changeColor", toolCallId: toolCall.toolCallId, output: { success: ok } });
      } else if (toolCall.toolName === "getBoardState") {
        const state = tools.getBoardState();
        addToolOutputFn({ tool: "getBoardState", toolCallId: toolCall.toolCallId, output: state });
      }
    },
  });

  useEffect(() => {
    addToolOutputRef.current = (args) => { void addToolOutput(args); };
  }, [addToolOutput]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    }
  }, [messages]);

  return (
    <div
      className="flex flex-col h-full min-h-0 bg-white rounded-2xl"
      style={{
        border: "3px solid #1a1a2e",
        boxShadow: "4px 4px 0 #1a1a2e",
        filter: "url(#hand-drawn)",
      }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center px-4 py-3 rounded-t-2xl"
        style={{
          background: "var(--crayon-purple)",
          borderBottom: "3px solid #7200ab",
        }}
      >
        <h2 className="font-sketch text-lg font-bold text-white">
          ✨ AI Assistant
        </h2>
        <button
          onClick={onClose}
          type="button"
          className="text-white font-black text-xl leading-none hover:opacity-70 transition-opacity"
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="font-bold text-sm" style={{ color: "var(--crayon-purple)" }}>
              Hi! I can help you work on your board. 🎨
            </p>
            <p className="text-sm font-semibold text-gray-500">Try asking me to:</p>
            <ul className="space-y-1.5">
              {SUGGESTIONS.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => { void sendMessage({ text: example }); }}
                    className="text-left w-full px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                    style={{
                      border: "2px solid var(--crayon-blue)",
                      color: "var(--crayon-blue)",
                      background: "#f0f5ff",
                    }}
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div
            className="rounded-xl p-2.5 text-sm font-semibold flex justify-between items-start gap-2"
            style={{
              background: "#fff5f5",
              border: "2px solid var(--crayon-red)",
              color: "var(--crayon-red)",
            }}
          >
            <span>{getDisplayErrorMessage(error)}</span>
            <button
              type="button"
              onClick={() => clearError()}
              className="shrink-0 font-black hover:opacity-70"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className="max-w-[85%] px-3 py-2 rounded-xl text-sm font-semibold"
              style={
                m.role === "user"
                  ? {
                      background: "var(--crayon-blue)",
                      color: "white",
                      border: "2px solid #0046cc",
                    }
                  : {
                      background: "#faf0ff",
                      color: "#1a1a2e",
                      border: "2px solid var(--crayon-purple)",
                    }
              }
            >
              {m.parts.map((part, idx) => {
                if (part.type === "text") {
                  return <p key={`${m.id}-${String(idx)}`}>{part.text}</p>;
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {status === "submitted" && (
          <div className="flex justify-start">
            <div
              className="px-3 py-2 rounded-xl text-sm font-bold"
              style={{ background: "#faf0ff", border: "2px solid var(--crayon-purple)", color: "var(--crayon-purple)" }}
            >
              Thinking... 🖍️
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            void sendMessage({ text: input });
            setInput("");
          }
        }}
        className="p-3"
        style={{ borderTop: "3px solid #1a1a2e" }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything... ✏️"
            className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold focus:outline-none transition-all"
            style={{
              border: "2.5px solid #1a1a2e",
              boxShadow: "2px 2px 0 #1a1a2e",
            }}
            disabled={status === "submitted"}
          />
          {status === "submitted" ? (
            <button
              type="button"
              onClick={() => stop()}
              className="crayon-btn px-3 py-2 text-sm font-bold"
              style={{
                background: "var(--crayon-red)",
                border: "2.5px solid #c00",
                boxShadow: "2px 2px 0 #c00",
                color: "white",
              }}
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="crayon-btn crayon-btn-purple px-3 py-2 text-sm disabled:opacity-50"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
