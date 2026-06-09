import { isKaspaAiEnabled, KASPA_AI_DISABLED_MESSAGE } from "../../aiFeature";
import { ASK_MODE, getAskApiKey, getAskApiUrl } from "./config";
import { normalizeAskAnswer } from "./answer";
import { postKaspaNewsAsk } from "./kaspaNews";
import { getAskQuestion, type AskRequestBody } from "./messages";

export const runtime = "nodejs";

type KaspaNewsAskResponse = {
  answer?: unknown;
  cacheInfo?: unknown;
  cacheKey?: unknown;
  queryId?: unknown;
};

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<Response> {
  if (!isKaspaAiEnabled) {
    return jsonError(KASPA_AI_DISABLED_MESSAGE, 503);
  }

  const apiKey = getAskApiKey();
  if (!apiKey) {
    return jsonError("Missing KASPA_NEWS_ASK_API_KEY", 500);
  }

  let body: AskRequestBody;
  try {
    body = (await request.json()) as AskRequestBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const question = getAskQuestion(body);
  if (!question) {
    return jsonError("A question is required", 400);
  }

  const payload = {
    op: "query",
    question,
    stream: false,
    mode: ASK_MODE,
  } as const;

  let upstream: Response;
  try {
    const askResult = await postKaspaNewsAsk(
      getAskApiUrl(),
      apiKey,
      payload,
      request.signal,
    );

    upstream = new Response(askResult.text, {
      headers: {
        "Content-Type": askResult.contentType ?? "application/json",
      },
      status: askResult.status,
    });
  } catch {
    return jsonError("Failed to reach the ASK API", 502);
  }

  if (!upstream.ok) {
    const errorBody = await upstream.text();
    return new Response(errorBody || "ASK request failed", {
      status: upstream.status || 502,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "text/plain; charset=utf-8",
      },
    });
  }

  let answerBody: KaspaNewsAskResponse;
  try {
    answerBody = (await upstream.json()) as KaspaNewsAskResponse;
  } catch {
    return jsonError("ASK API returned invalid JSON", 502);
  }

  if (typeof answerBody.answer !== "string") {
    return jsonError("ASK API returned an invalid answer", 502);
  }

  return Response.json({
    answer: normalizeAskAnswer(answerBody.answer),
    queryId: answerBody.queryId ?? null,
    cacheInfo: answerBody.cacheInfo ?? null,
    cacheKey: answerBody.cacheKey ?? null,
  });
}
