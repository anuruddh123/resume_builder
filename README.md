# Resume Tailor

Upload your resume and a job description; get back a version of your resume rewritten
and keyword-optimized for that specific posting, editable in the browser and
downloadable as an ATS-friendly PDF.

## Setup

```bash
npm install
cp .env.example .env.local     # then paste your key into .env.local
npm run dev
```

Get a **free** API key at <https://aistudio.google.com/apikey> — Google AI Studio's
free tier needs no credit card. Open <http://localhost:3000>.

Set `GEMINI_MODEL` in `.env.local` to change models; it defaults to
`gemini-2.5-flash`. Use a specific model only when it is enabled for your API key.

## How it works

```
Upload resume (PDF/DOCX/TXT/MD) + paste job description
  │
  ├─ POST /api/tailor
  │    PDFs go to Gemini inline as application/pdf, so the model reads the real
  │    layout instead of a flattened text dump. DOCX is converted locally with
  │    mammoth. One call returns a structured resume object plus a log of every
  │    change, constrained by responseJsonSchema and re-validated with Zod.
  │
  ├─ Structured JSON is serialized to Markdown (lib/markdown.ts)
  │    The model returns typed data, not prose, so the Markdown shape is always
  │    predictable. You then edit that Markdown freely.
  │
  └─ POST /api/export
       Your edited Markdown is parsed back into blocks and rendered with
       @react-pdf/renderer. The PDF is generated from exactly what you see.
```

## Formatting

Content and appearance are separate. The rewrite decides what the resume says; the
sidebar decides how it looks, and neither can break the other.

- **Format** — seven presets in `lib/templates.ts`: *Match my upload* (reproduces the
  file you sent) plus Classic, Modern, Compact, Elegant, Technical and Minimal. A
  template only sets typography, so switching format never touches a word of content.
- **Typography** — body and heading typeface, page size (US Letter / A4), type sizes,
  line spacing, density, margins, accent colour, heading case and rule, bullet glyph,
  contact separator, and whether links print underlined.
- **Links** — the header contact line is editable item by item: add, relabel, reorder
  or remove. Typed addresses get the right scheme automatically (`mailto:`, `tel:`,
  `https://`). Links anywhere else are written as `[text](url)` in the Edit tab.

Every template stays ATS-parseable by construction. The properties that decide whether
a resume parses at all — single column, no tables or text boxes, no graphics, real
selectable text, and one of the three PDF standard font families (Helvetica/Arial,
Times, Courier, none of which are embedded) — live in the renderer, not in the
template, so no preset can opt out of them.

## Rewrite behavior

The model optimizes aggressively for keyword match: it reuses the posting's exact
terminology, front-loads relevant material, and reorders roles and skills by relevance.

These constraints are absolute and enforced by the system prompt:

- Employers, job titles, dates, degrees, and existing metrics are copied verbatim.
- No invented numbers, technologies, jobs, or credentials.
- Nothing is deleted from your history — only reordered and reweighted.

**Review the "What changed" panel before you send anything.** Every edit is tagged, and
the panel opens on the `inferred` group by default — those are edits that assert
something your original resume did not clearly state. Aggressive optimization
occasionally implies more experience than you have; that group is where it shows up.
Requirements that could not be covered without fabricating experience are listed
separately under "Still missing".

## Layout

| Path | Purpose |
| --- | --- |
| `lib/schemas.ts` | Zod schemas — the contract for the model's structured output |
| `lib/prompt.ts` | System prompt |
| `lib/llm.ts` | The Gemini call — the only file that talks to a model provider |
| `lib/extract.ts` | Upload → Gemini content Part |
| `lib/markdown.ts` | Resume ⇄ Markdown ⇄ PDF blocks (pure, tested) |
| `lib/design.ts` | Format vocabulary + the clamp on every design value |
| `lib/templates.ts` | The seven format presets |
| `lib/links.ts` | Header contact line ⇄ editable items (pure, tested) |
| `app/api/tailor/route.ts` | Tailoring endpoint |
| `app/api/export/route.ts` | PDF endpoint |
| `components/pdf/ResumeDocument.tsx` | ATS-friendly PDF template |

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm test           # Markdown + header-link round-trip tests
```

## Notes

- **PDF template is deliberately plain**: single column, no tables, no graphics,
  standard non-embedded fonts. Decorative resumes break ATS parsers, which defeats
  the point — so the templates vary typography only.
- **Untrusted design values are clamped, not trusted**: `normalizeDesign` whitelists
  every enum, clamps every number and validates every colour before it reaches the
  renderer. Bullet and separator glyphs are restricted to WinAnsi, because anything
  outside it renders as a blank box in the standard fonts.
- **Upload limit is 4 MB**, sized under Vercel's ~4.5 MB serverless request body cap.
- **No database.** Everything is per-session React state; refreshing loses your work.
