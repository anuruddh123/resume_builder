import type { Part } from "@google/genai";
import { MAX_FILE_BYTES } from "./constants";

export class UnsupportedFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFileError";
  }
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

/**
 * Converts an uploaded resume into a Gemini content Part.
 *
 * PDFs are sent inline as application/pdf, so the model reads the real layout
 * instead of a flattened text dump. DOCX has no native support, so it is
 * converted to text locally.
 */
export async function fileToPart(file: File): Promise<Part> {
  if (file.size === 0) {
    throw new UnsupportedFileError("That file is empty.");
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new UnsupportedFileError(
      `That file is ${mb} MB. Please upload a resume under 4 MB.`,
    );
  }

  const ext = extensionOf(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf" || ext === ".pdf") {
    return {
      inlineData: {
        mimeType: "application/pdf",
        data: buffer.toString("base64"),
      },
    };
  }

  if (ext === ".docx") {
    // Imported lazily so the DOCX parser is not pulled into every request.
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ buffer });
    if (!value.trim()) {
      throw new UnsupportedFileError("No text could be read from that .docx file.");
    }
    return { text: value };
  }

  if (ext === ".txt" || ext === ".md" || file.type.startsWith("text/")) {
    const text = buffer.toString("utf8");
    if (!text.trim()) throw new UnsupportedFileError("That file contains no text.");
    return { text };
  }

  if (ext === ".doc") {
    throw new UnsupportedFileError(
      "Legacy .doc files are not supported. Save as .docx or PDF and try again.",
    );
  }

  throw new UnsupportedFileError(
    `Unsupported file type "${ext || file.type || "unknown"}". Upload a PDF, DOCX, TXT, or MD file.`,
  );
}
