import test from "node:test";
import assert from "node:assert/strict";
import {
  readContactItems,
  writeContactItems,
  setContactSeparator,
  parseContactItems,
  formatContactItems,
  hrefFromInput,
} from "../lib/links.ts";

const doc = [
  "# Ada Lovelace",
  "",
  "[ada@example.com](mailto:ada@example.com) | London | [github.com/ada](https://github.com/ada)",
  "",
  "## SUMMARY",
  "",
  "Analytical engine programmer.",
  "",
].join("\n");

test("reads header items, keeping plain text alongside links", () => {
  assert.deepEqual(readContactItems(doc), [
    { label: "ada@example.com", url: "mailto:ada@example.com" },
    { label: "London", url: "" },
    { label: "github.com/ada", url: "https://github.com/ada" },
  ]);
});

test("does not split on a slash inside a URL", () => {
  const items = parseContactItems("[linkedin.com/in/ada](https://linkedin.com/in/ada) / London");
  assert.equal(items.length, 2);
  assert.equal(items[0].url, "https://linkedin.com/in/ada");
  assert.equal(items[1].label, "London");
});

test("adds a link without disturbing the rest of the document", () => {
  const next = writeContactItems(
    doc,
    [...readContactItems(doc), { label: "Portfolio", url: "https://ada.dev" }],
    "|",
  );

  assert.ok(next.includes("[Portfolio](https://ada.dev)"));
  assert.ok(next.includes("## SUMMARY"));
  assert.ok(next.includes("Analytical engine programmer."));
  assert.equal(next.split("\n")[0], "# Ada Lovelace");
});

test("round-trips items through a separator change", () => {
  const switched = setContactSeparator(doc, "·");
  assert.ok(switched.includes("ada@example.com](mailto:ada@example.com) · London ·"));
  assert.deepEqual(readContactItems(switched), readContactItems(doc));
});

test("removing every item drops the contact line entirely", () => {
  const emptied = writeContactItems(doc, [], "|");
  assert.deepEqual(readContactItems(emptied), []);
  assert.equal(emptied.split("\n")[0], "# Ada Lovelace");
  assert.ok(emptied.includes("## SUMMARY"));
  assert.ok(!emptied.includes("London"));
});

test("inserts a contact line under a name that has none", () => {
  const bare = "# Grace Hopper\n\n## SUMMARY\n\nCompiler pioneer.\n";
  const next = writeContactItems(bare, [{ label: "grace@navy.mil", url: "" }], "|");

  assert.deepEqual(readContactItems(next), [{ label: "grace@navy.mil", url: "" }]);
  assert.ok(next.indexOf("grace@navy.mil") < next.indexOf("## SUMMARY"));
});

test("leaves a document with no name heading untouched", () => {
  const headless = "Just some text.\n";
  assert.equal(writeContactItems(headless, [{ label: "x", url: "" }], "|"), headless);
});

test("gives typed addresses the scheme that makes them clickable", () => {
  assert.equal(hrefFromInput("ada@example.com"), "mailto:ada@example.com");
  assert.equal(hrefFromInput("+1 (555) 010-0100"), "tel:+15550100100");
  assert.equal(hrefFromInput("linkedin.com/in/ada"), "https://linkedin.com/in/ada");
  assert.equal(hrefFromInput("https://ada.dev"), "https://ada.dev");
  assert.equal(hrefFromInput("   "), "");
});

test("drops items that would render as nothing", () => {
  assert.equal(formatContactItems([{ label: "", url: "https://x.com" }, { label: "A", url: "" }], "|"), "A");
});
