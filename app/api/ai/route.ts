import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { boardState, message } = body;

  // AI integration: Pass boardState and message to LLM, return tool calls
  // that update RTDB board objects.
  return Response.json({
    message: "AI integration: Add OpenAI/Anthropic here.",
    boardState,
    userMessage: message,
  });
}
