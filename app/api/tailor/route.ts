import { NextResponse } from "next/server";
import { fileToPart, UnsupportedFileError } from "@/lib/extract";
import {
  tailorResume,
  BlockedError,
  EmptyResponseError,
  GeminiTimeoutError,
  GeminiApiError,
  MalformedOutputError,
  MissingCredentialsError,
  getModel,
} from "@/lib/llm";
import { resumeToMarkdown } from "@/lib/markdown";
import { normalizeDesign } from "@/lib/design";
import { MIN_JD_CHARS } from "@/lib/constants";

export const runtime = "nodejs";
// Netlify's synchronous function limit is 26 seconds on the current plan.
export const maxDuration = 26;

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Could not read the upload. Please try again.", 400);
  }

  const resume = form.get("resume");
  const jobDescription = form.get("jobDescription");

  if (!(resume instanceof File)) {
    return fail("No resume file was uploaded.", 400);
  }
  if (typeof jobDescription !== "string" || jobDescription.trim().length < MIN_JD_CHARS) {
    return fail("Please paste the full job description (at least a few sentences).", 400);
  }

  try {
    const resumePart = await fileToPart(resume);
    const result = await tailorResume({ resumePart, jobDescription });

    // The model's design reading is clamped once, here, so the markdown, the
    // on-screen preview, and the exported PDF all agree on it.
    const design = normalizeDesign(result.design);

    return NextResponse.json({
      ...result,
      design,
      markdown: resumeToMarkdown(result.resume, design),
    });
  } catch (error) {
    if (error instanceof UnsupportedFileError) {
      return fail(error.message, 400);
    }

    if (error instanceof MissingCredentialsError) {
      return fail(
        "No Gemini API key found. Add GEMINI_API_KEY to .env.local (get one free at aistudio.google.com/apikey), then restart the dev server.",
        500,
      );
    }

    if (error instanceof BlockedError) {
      return fail(
        "The request was blocked by Gemini's safety filters. Try trimming unusual content from the job description.",
        422,
      );
    }

    if (error instanceof EmptyResponseError) {
      return fail(
        error.reason === "MAX_TOKENS"
          ? "The response was cut off before completing. Try a shorter job description."
          : "The model returned an empty response. Please try again.",
        502,
      );
    }

    if (error instanceof GeminiTimeoutError) {
      return fail(
        "Gemini took too long to respond. Try a shorter job description or resume, then try again.",
        504,
      );
    }

    if (error instanceof MalformedOutputError) {
      return fail(
        "The model returned an unexpected format. Try again — this is usually transient.",
        502,
      );
    }

    if (error instanceof GeminiApiError) {
      const detail = error.message ?? "";
      console.error("Gemini API error:", error.status, detail);

      if (error.status === 401 || (error.status === 400 && /api[_ ]?key/i.test(detail))) {
        return fail(
          "Invalid Gemini API Key. Your key must start with 'AIzaSy' from Google AI Studio (https://aistudio.google.com/apikey). Check .env.local.",
          401,
        );
      }
      if (error.status === 403) {
        return fail(
          "That API key is not authorized. Confirm it was created for the Gemini API at aistudio.google.com/apikey.",
          403,
        );
      }
      if (error.status === 404) {
        return fail(
          `The model "${getModel()}" is not available for this key. Set GEMINI_MODEL in .env.local to one your account supports (e.g. gemini-3.6-flash).`,
          502,
        );
      }
      if (error.status === 429) {
        return fail(
          "Gemini's free-tier rate limit was hit. Please wait a minute and try again.",
          429,
        );
      }
      if (error.status >= 500) {
        return fail(
          `Gemini is temporarily unavailable (${getModel()} returned status ${error.status}). Google's servers are experiencing high demand — please wait a moment and try again.`,
          503,
        );
      }
      return fail(detail || `The API returned an error (${error.status}).`, 502);
    }

    console.error("Unexpected error in /api/tailor:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("fetch failed") || msg.includes("Timeout") || msg.includes("timeout")) {
      return fail(
        "Connection to Gemini API timed out. Please check your internet connection and try again.",
        504,
      );
    }
    return fail("Something went wrong while tailoring your resume.", 500);
  }
}
