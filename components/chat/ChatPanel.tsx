"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useBoardTools } from "@/hooks/useBoardTools";
import { useViewport } from "@/components/providers/ViewportProvider";
import { getDefaultObjectPosition } from "@/lib/ai/boardTools";
import { useRef, useEffect, useState } from "react";

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const tools = useBoardTools();
  const viewport = useViewport();
  const [input, setInput] = useState("");
  const addToolOutputRef = useRef<((args: { tool: string; toolCallId: string; output: unknown }) => void) | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, addToolOutput, status, error, clearError } = useChat({
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
            text?: string;
            x?: number;
            y?: number;
            color?: string;
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
          const { type, x, y, width, height, color } = (input ?? {}) as {
            type?: "rect" | "circle";
            x?: number;
            y?: number;
            width?: number;
            height?: number;
            color?: string;
          };
          const defaultPos = getDefaultObjectPosition(viewport);
          const id = tools.createShape(
            type === "circle" ? "circle" : "rect",
            typeof x === "number" ? x : defaultPos.x,
            typeof y === "number" ? y : defaultPos.y,
            typeof width === "number" ? width : 100,
            typeof height === "number" ? height : 100,
            color ?? "#3b82f6"
          );
          addToolOutputFn({ tool: "createShape", toolCallId: toolCall.toolCallId, output: { id } });
        } else if (toolCall.toolName === "createFrame") {
          const { title, x, y, width, height } = (input ?? {}) as {
            title?: string;
            x?: number;
            y?: number;
            width?: number;
            height?: number;
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
            fromId: string;
            toId: string;
            style?: "line" | "arrow" | "both";
          };
          const id = tools.createConnector(fromId, toId, style ?? "arrow");
          addToolOutputFn({ tool: "createConnector", toolCallId: toolCall.toolCallId, output: { id } });
        } else if (toolCall.toolName === "moveObject") {
          const { objectId, x, y } = (input ?? {}) as { objectId: string; x: number; y: number };
          const ok = tools.moveObject(objectId, x, y);
          addToolOutputFn({ tool: "moveObject", toolCallId: toolCall.toolCallId, output: { success: ok } });
        } else if (toolCall.toolName === "resizeObject") {
          const { objectId, width, height } = (input ?? {}) as {
            objectId: string;
            width: number;
            height: number;
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
    addToolOutputRef.current = (args) => {
      void addToolOutput(args);
    };
  }, [addToolOutput]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold">AI Assistant</h2>
        <button
          onClick={onClose}
          type="button"
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label="Close chat"
        >
          ×
        </button>
      </div>
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-left space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">Hi! I can help you work on your board.</p>
              <p className="mb-2">Try asking me to:</p>
              <ul className="space-y-1">
                {[
                  "Create a SWOT analysis",
                  "Add sticky notes for a brainstorming session",
                  "Build a simple flowchart or diagram",
                  "Organize ideas into frames with connectors",
                ].map((example) => (
                  <li key={example}>
                    <button
                      type="button"
                      onClick={() => {
                        sendMessage({ text: example });
                      }}
                      className="text-left w-full px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {error && (
          <div className="rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 text-sm text-red-700 dark:text-red-300 flex justify-between items-start gap-2">
            <span>{error.message}</span>
            <button
              type="button"
              onClick={() => clearError()}
              className="shrink-0 text-red-500 hover:text-red-700"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <span className="text-xs text-gray-500">{m.role}</span>
            <div className="text-sm">
              {m.parts.map((part, idx) => {
                if (part.type === "text") {
                  return <p key={`${m.id}-${String(idx)}`}>{part.text}</p>;
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            void sendMessage({ text: input });
            setInput("");
          }
        }}
        className="p-3 border-t border-gray-200 dark:border-gray-700"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask to add a sticky note..."
          className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          disabled={status === "submitted"}
        />
      </form>
    </div>
  );
}
