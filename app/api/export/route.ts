import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { markdownToBlocks, blockText } from "@/lib/markdown";
import { normalizeDesign } from "@/lib/design";
import { ResumeDocument } from "@/components/pdf/ResumeDocument";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Derives a safe, ASCII-only download filename from the resume's name heading. */
function filenameFrom(blocks: ReturnType<typeof markdownToBlocks>): string {
  const heading = blocks.find((b) => b.type === "h1");
  const base = heading ? blockText(heading) : "";
  const slug = base
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9-]/g, "")
    .slice(0, 60);
  return `${slug || "resume"}-tailored.pdf`;
}

export async function POST(request: Request) {
  let markdown: unknown;
  let design: unknown;
  try {
    ({ markdown, design } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof markdown !== "string" || !markdown.trim()) {
    return NextResponse.json({ error: "No resume content to export." }, { status: 400 });
  }

  try {
    const blocks = markdownToBlocks(markdown);
    if (!blocks.length) {
      return NextResponse.json({ error: "No resume content to export." }, { status: 400 });
    }

    // Called directly rather than as <ResumeDocument />: renderToBuffer expects
    // an element whose props are DocumentProps, which is what the inner
    // <Document> element already is.
    const buffer = await renderToBuffer(
      ResumeDocument({ blocks, design: normalizeDesign(design) }),
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameFrom(blocks)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("PDF export failed:", error);
    return NextResponse.json({ error: "Could not generate the PDF." }, { status: 500 });
  }
}
