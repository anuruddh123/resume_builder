import { GoogleGenAI, ApiError, type Part } from "@google/genai";
import { z } from "zod";
import { TailorResultSchema, type TailorResult } from "./schemas";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

/**
 * Use the current Flash model recommended by the Gemini API. Override with
 * GEMINI_MODEL when the API key needs a different model.
 */
export const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

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
  reason?: string;
  constructor(reason?: string) {
    super("The model returned an empty response.");
    this.name = "EmptyResponseError";
    this.reason = reason;
  }
}

export class BlockedError extends Error {
  reason?: string;
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

  // Constructed per request so a key added to .env.local is picked up without
  // a stale client surviving from before it existed.
  const ai = new GoogleGenAI({ apiKey });

  const config: Record<string, unknown> = {
    systemInstruction: SYSTEM_PROMPT,
    responseMimeType: "application/json",
    responseJsonSchema: RESPONSE_SCHEMA,
    maxOutputTokens: 8192,
  };

  // If a model supporting thinkingLevel (like gemini-3.6-flash) is configured,
  // keep thinking minimal so requests resolve swiftly within serverless limits.
  if (MODEL.includes("3.6")) {
    config.thinkingConfig = { thinkingLevel: "minimal" };
  }

  const request = ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [resumePart, { text: buildUserPrompt(jobDescription) }],
      },
    ],
    config,
  });
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new GeminiTimeoutError()), 50_000);
  });
  const response = await Promise.race([request, timeout]);

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
