import { NextResponse } from "next/server";
import { fileToPart, UnsupportedFileError } from "@/lib/extract";
import {
  tailorResume,
  BlockedError,
  EmptyResponseError,
  GeminiApiError,
  MalformedOutputError,
  MissingCredentialsError,
  MODEL,
} from "@/lib/llm";
import { resumeToMarkdown } from "@/lib/markdown";
import { normalizeDesign } from "@/lib/design";
import { MIN_JD_CHARS } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    if (error instanceof MalformedOutputError) {
      return fail(
        "The model returned an unexpected format. Try again — this is usually transient.",
        502,
      );
    }

    if (error instanceof GeminiApiError) {
      const detail = error.message ?? "";
      console.error("Gemini API error:", error.status, detail);

      if (error.status === 400 && /api[_ ]?key/i.test(detail)) {
        return fail("GEMINI_API_KEY is invalid. Check .env.local.", 500);
      }
      if (error.status === 403) {
        return fail(
          "That API key is not authorized. Confirm it was created for the Gemini API at aistudio.google.com/apikey.",
          500,
        );
      }
      if (error.status === 404) {
        return fail(
          `The model "${MODEL}" is not available for this key. Set GEMINI_MODEL in .env.local to one your account supports.`,
          502,
        );
      }
      if (error.status === 429) {
        return fail(
          "Gemini's free-tier rate limit was hit. Wait a minute and try again.",
          429,
        );
      }
      if (error.status >= 500) {
        return fail("Gemini is temporarily unavailable. Try again shortly.", 503);
      }
      return fail(detail || `The API returned an error (${error.status}).`, 502);
    }

    console.error("Unexpected error in /api/tailor:", error);
    return fail("Something went wrong while tailoring your resume.", 500);
  }
}
