import dns from "node:dns";
import { GoogleGenAI, ApiError, type Part } from "@google/genai";
import { z } from "zod";
import { TailorResultSchema, type TailorResult } from "./schemas";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

// Prioritize IPv4 DNS lookup to prevent connection timeouts on systems with broken IPv6 routing.
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignored in environments where setDefaultResultOrder is unavailable
}

export const DEFAULT_MODEL = "gemini-3.6-flash";

/**
<<<<<<< HEAD
 * Use a generally available Flash Lite model by default for fastest response time.
 * Override with GEMINI_MODEL in .env.local if needed.
 */
export const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
=======
 * Reads the configured Gemini model dynamically, defaulting to `gemini-3.6-flash`.
 */
export function getModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export const MODEL = getModel();
>>>>>>> b59cbeb77a5f37424e0281ca2f97f69432e247d7

export class MissingCredentialsError extends Error {
  constructor() {
    super("No Gemini API key found.");
    this.name = "MissingCredentialsError";
  }
}

export class GeminiTimeoutError extends Error {
  constructor() {
    super("The Gemini request timed out.");
    this.name = "GeminiTimeoutError";
  }
}

export class EmptyResponseError extends Error {
  readonly reason?: string;
  constructor(reason?: string) {
    super("The model returned an empty response.");
    this.name = "EmptyResponseError";
    this.reason = reason;
  }
}

export class BlockedError extends Error {
  readonly reason?: string;
  constructor(reason?: string) {
    super("The request was blocked by the model's safety filters.");
    this.name = "BlockedError";
    this.reason = reason;
  }
}

export class MalformedOutputError extends Error {
  constructor() {
    super("The model returned output that did not match the expected shape.");
    this.name = "MalformedOutputError";
  }
}

export { ApiError as GeminiApiError };

/**
 * Gemini's responseJsonSchema accepts standard JSON Schema but only a documented
 * subset of keywords. Zod emits `$schema`, which is not in that subset, so it is
 * stripped. Everything else the schema uses (type, properties, required,
 * additionalProperties, description, enum, items) is supported.
 */
function buildResponseSchema(): unknown {
  const schema = z.toJSONSchema(TailorResultSchema) as Record<string, unknown>;
  const { $schema: _ignored, ...rest } = schema;
  return rest;
}

const RESPONSE_SCHEMA = buildResponseSchema();

export type TailorInput = {
  resumePart: Part;
  jobDescription: string;
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function tailorResume({
  resumePart,
  jobDescription,
}: TailorInput): Promise<TailorResult> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || apiKey === "PASTE_YOUR_KEY_HERE") {
    throw new MissingCredentialsError();
  }

  const model = getModel();

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 120_000,
    },
  });

  const config: Record<string, unknown> = {
    systemInstruction: SYSTEM_PROMPT,
    responseMimeType: "application/json",
    responseJsonSchema: RESPONSE_SCHEMA,
    maxOutputTokens: 16384,
  };

  // If a model supporting thinkingLevel (like gemini-3.6-flash) is configured,
  // keep thinking minimal so requests resolve swiftly within serverless limits.
  if (model.includes("3.6") || model.includes("2.5")) {
    config.thinkingConfig = { thinkingLevel: "minimal" };
  }

  const maxRetries = 3;
  let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [resumePart, { text: buildUserPrompt(jobDescription) }],
          },
        ],
        config,
      });
      break;
    } catch (err: unknown) {
      const isTransient =
        err instanceof ApiError && (err.status === 503 || err.status === 429 || (err.status !== undefined && err.status >= 500));
      const isNetworkTimeout =
        err instanceof Error &&
        (err.message.includes("fetch failed") ||
          err.message.includes("timeout") ||
          err.message.includes("Connect Timeout") ||
          err.name === "AbortError");

      if ((isTransient || isNetworkTimeout) && attempt < maxRetries) {
        const delay = (attempt + 1) * 2000;
        console.warn(
          `[Gemini API] Request failed (${err instanceof ApiError ? `HTTP ${err.status}` : (err instanceof Error ? err.message : "Error")}, attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`,
        );
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }

  if (!response) {
    throw new EmptyResponseError();
  }

  const blockReason = response.promptFeedback?.blockReason;
  if (blockReason) throw new BlockedError(String(blockReason));

  const finishReason = response.candidates?.[0]?.finishReason;
  const text = response.text;

  if (!text?.trim()) {
    throw new EmptyResponseError(finishReason ? String(finishReason) : undefined);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new MalformedOutputError();
  }

  const result = TailorResultSchema.safeParse(parsed);
  if (!result.success) {
    console.error("Schema validation failed:", result.error.issues.slice(0, 5));
    throw new MalformedOutputError();
  }

  return result.data;
}
