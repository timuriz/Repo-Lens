export type AiErrorKind = "temporary" | "config" | "fatal";

export interface FriendlyAiError {
  kind: AiErrorKind;
  title: string;
  message: string;
}

interface GeminiErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

function tryParseGeminiJson(text: string): GeminiErrorBody | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    return JSON.parse(trimmed) as GeminiErrorBody;
  } catch {
    return null;
  }
}

function fromGeminiBody(body: GeminiErrorBody): FriendlyAiError | null {
  const code = body.error?.code;
  const status = body.error?.status?.toUpperCase();
  const rawMessage = body.error?.message ?? "";

  if (code === 503 || status === "UNAVAILABLE") {
    return {
      kind: "temporary",
      title: "Gemini is busy",
      message: "The model is under heavy load right now. Wait a minute and try again.",
    };
  }

  if (code === 429 || status === "RESOURCE_EXHAUSTED") {
    return {
      kind: "temporary",
      title: "Rate limit reached",
      message: "Too many requests to Gemini. Wait a moment and try again.",
    };
  }

  if (
    code === 401 ||
    code === 403 ||
    status === "PERMISSION_DENIED" ||
    status === "UNAUTHENTICATED"
  ) {
    return {
      kind: "config",
      title: "Invalid API key",
      message:
        "Check that GEMINI_API_KEY in your .env is correct and has access to the Gemini API.",
    };
  }

  if (rawMessage) {
    return {
      kind: "fatal",
      title: "Analysis failed",
      message: rawMessage,
    };
  }

  return null;
}

function fromMessageText(text: string): FriendlyAiError {
  const lower = text.toLowerCase();

  if (
    lower.includes("high demand") ||
    lower.includes("try again later") ||
    lower.includes("unavailable")
  ) {
    return {
      kind: "temporary",
      title: "Gemini is busy",
      message: "The model is under heavy load right now. Wait a minute and try again.",
    };
  }

  if (
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted")
  ) {
    return {
      kind: "temporary",
      title: "Rate limit reached",
      message: "Too many requests to Gemini. Wait a moment and try again.",
    };
  }

  if (
    lower.includes("api key") ||
    lower.includes("invalid key") ||
    lower.includes("permission denied")
  ) {
    return {
      kind: "config",
      title: "Invalid API key",
      message:
        "Check that GEMINI_API_KEY in your .env is correct and has access to the Gemini API.",
    };
  }

  if (lower.includes("empty response")) {
    return {
      kind: "temporary",
      title: "Empty response",
      message: "Gemini returned no content. Try again in a moment.",
    };
  }

  return {
    kind: "fatal",
    title: "Analysis failed",
    message: text.length > 180 ? `${text.slice(0, 177)}…` : text,
  };
}

/** Turn raw Gemini / network errors into short, user-facing copy. */
export function toFriendlyAiError(err: unknown): FriendlyAiError {
  if (err instanceof Error) {
    const parsed = tryParseGeminiJson(err.message);
    if (parsed) {
      const fromBody = fromGeminiBody(parsed);
      if (fromBody) return fromBody;
    }
    return fromMessageText(err.message);
  }

  if (typeof err === "string") {
    const parsed = tryParseGeminiJson(err);
    if (parsed) {
      const fromBody = fromGeminiBody(parsed);
      if (fromBody) return fromBody;
    }
    return fromMessageText(err);
  }

  return {
    kind: "fatal",
    title: "Analysis failed",
    message: "Something went wrong while generating the analysis.",
  };
}
