import test from "node:test";
import assert from "node:assert/strict";
import {
  resumeToMarkdown,
  markdownToBlocks,
  blockText,
  normalizeHref,
} from "../lib/markdown.ts";

const fixture = {
  contact: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "555-0100",
    location: "London",
    links: [{ label: "github.com/ada", url: "https://github.com/ada" }],
  },
  sections: [
    {
      heading: "SUMMARY",
      kind: "summary",
      entries: [
        {
          title: "",
          organization: "",
          dates: "",
          location: "",
          url: "",
          body: ["Analytical engine programmer with a focus on numerical methods."],
          bullets: [],
        },
      ],
    },
    {
      heading: "PROFESSIONAL EXPERIENCE",
      kind: "experience",
      entries: [
        {
          title: "Lead Programmer",
          organization: "Analytical Engine Co",
          dates: "1842 - 1843",
          location: "London",
          url: "",
          body: [],
          bullets: [
            "Designed the first published algorithm for a general-purpose computing machine.",
            "Authored technical notes translated across three languages.",
          ],
        },
      ],
    },
    {
      heading: "Technical Skills",
      kind: "skills",
      entries: [
        {
          title: "Languages",
          organization: "",
          dates: "",
          location: "",
          url: "",
          body: ["Assembly", "Mathematics"],
          bullets: [],
        },
      ],
    },
    {
      heading: "EDUCATION",
      kind: "education",
      entries: [
        {
          title: "Mathematics",
          organization: "Private tutoring",
          dates: "1830 - 1835",
          location: "",
          url: "",
          body: [],
          bullets: [],
        },
      ],
    },
  ],
};

test("round-trips every heading and bullet through markdown", () => {
  const blocks = markdownToBlocks(resumeToMarkdown(fixture));
  const text = blocks.map(blockText);

  assert.equal(blocks[0].type, "h1");
  assert.equal(text[0], "Ada Lovelace");

  assert.ok(text.includes("ada@example.com | 555-0100 | London | github.com/ada"));

  for (const heading of ["SUMMARY", "PROFESSIONAL EXPERIENCE", "Technical Skills", "EDUCATION"]) {
    assert.ok(
      blocks.some((b) => b.type === "h2" && blockText(b) === heading),
      `missing H2: ${heading}`,
    );
  }

  assert.ok(text.includes("Lead Programmer — Analytical Engine Co"));

  const bullets = blocks.filter((b) => b.type === "bullet").map(blockText);
  assert.equal(bullets.length, 2);
  for (const bullet of fixture.sections[1].entries[0].bullets) {
    assert.ok(bullets.includes(bullet), `missing bullet: ${bullet}`);
  }
});

test("keeps the source section order and heading text verbatim", () => {
  const headings = markdownToBlocks(resumeToMarkdown(fixture))
    .filter((b) => b.type === "h2")
    .map(blockText);

  assert.deepEqual(headings, [
    "SUMMARY",
    "PROFESSIONAL EXPERIENCE",
    "Technical Skills",
    "EDUCATION",
  ]);
});

test("preserves inline bold and italic as styled runs", () => {
  const blocks = markdownToBlocks(resumeToMarkdown(fixture));

  const skills = blocks.find((b) => blockText(b).startsWith("Languages:"));
  assert.ok(skills, "skills line missing");
  assert.equal(skills.runs[0].bold, true);
  assert.equal(skills.runs[0].text, "Languages:");

  const dates = blocks.find((b) => blockText(b) === "1842 - 1843 · London");
  assert.ok(dates, "dates line missing");
  assert.equal(dates.runs[0].italic, true);
});

test("carries hyperlinks through to the rendered blocks", () => {
  const blocks = markdownToBlocks(resumeToMarkdown(fixture));
  const runs = blocks.flatMap((b) => b.runs);

  const github = runs.find((run) => run.text === "github.com/ada");
  assert.ok(github, "github link text missing");
  assert.equal(github.href, "https://github.com/ada");

  const email = runs.find((run) => run.text === "ada@example.com");
  assert.equal(email.href, "mailto:ada@example.com");
});

test("keeps an entry-level link attached to its title", () => {
  const withProject = {
    ...fixture,
    sections: [
      {
        heading: "PROJECTS",
        kind: "projects",
        entries: [
          {
            title: "Note G",
            organization: "",
            dates: "",
            location: "",
            url: "example.com/note-g",
            body: [],
            bullets: [],
          },
        ],
      },
    ],
  };

  const heading = markdownToBlocks(resumeToMarkdown(withProject)).find(
    (b) => b.type === "h3" && blockText(b) === "Note G",
  );
  assert.ok(heading, "project heading missing");
  // Bare domains are promoted to https so the PDF annotation resolves.
  assert.equal(heading.runs[0].href, "https://example.com/note-g");
});

test("normalizes hrefs without mangling explicit schemes", () => {
  assert.equal(normalizeHref("linkedin.com/in/ada"), "https://linkedin.com/in/ada");
  assert.equal(normalizeHref("https://example.com/x"), "https://example.com/x");
  assert.equal(normalizeHref("mailto:a@b.com"), "mailto:a@b.com");
  assert.equal(normalizeHref("  "), "");
});

test("omits empty optional contact fields without leaving separators", () => {
  const sparse = {
    ...fixture,
    contact: { name: "Grace Hopper", email: "", phone: "", location: "", links: [] },
  };
  const md = resumeToMarkdown(sparse);
  assert.ok(!md.includes("|"), "empty fields should not emit separators");
});

test("degrades unsupported markdown to paragraphs instead of dropping it", () => {
  const blocks = markdownToBlocks("| a | b |\n| - | - |\n| 1 | 2 |\n\nplain text");
  assert.ok(blocks.some((b) => blockText(b).includes("plain text")));
});
