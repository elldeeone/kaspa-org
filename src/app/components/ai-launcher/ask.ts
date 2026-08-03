import { ASK_API_PATH, LOADING_MESSAGE_KEYS } from "./constants";
import type { ChatRequestMessage } from "./types";

type AskResponseBody = {
  answer?: unknown;
};

export function getNextLoadingMessageIndex(current: number): number {
  if (LOADING_MESSAGE_KEYS.length <= 1) {
    return current;
  }

  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);

  let next = bytes[0] % LOADING_MESSAGE_KEYS.length;
  if (next === current) {
    next = (next + 1) % LOADING_MESSAGE_KEYS.length;
  }

  return next;
}

export async function requestKaspaAnswer(
  messages: ChatRequestMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(ASK_API_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Chat failed: ${response.status} - ${body}`);
  }

  const data = (await response.json()) as AskResponseBody;
  if (typeof data.answer !== "string") {
    throw new Error("Chat failed: invalid answer response");
  }

  return data.answer;
}
