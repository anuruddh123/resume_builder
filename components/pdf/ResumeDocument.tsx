import React from "react";
import { Document, Page, Text, View, Link, StyleSheet } from "@react-pdf/renderer";
import type { Block, TextRun } from "@/lib/markdown";
import {
  DENSITY_SCALE,
  MARGIN_POINTS,
  normalizeDesign,
  type Design,
} from "@/lib/design";

/**
 * The layout mirrors the *uploaded* document rather than imposing a house
 * style: typeface, accent colour, heading rules, bullet glyph, density and
 * margins all come from the `design` the model read off the original.
 *
 * What stays fixed is the ATS-safe skeleton — single column, no tables, no
 * graphics, standard fonts, real selectable text. Those are the properties
 * that decide whether the file parses at all.
 */

const FONT_SETS = {
  sans: {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique",
    boldItalic: "Helvetica-BoldOblique",
  },
  serif: {
    regular: "Times-Roman",
    bold: "Times-Bold",
    italic: "Times-Italic",
    boldItalic: "Times-BoldItalic",
  },
  mono: {
    regular: "Courier",
    bold: "Courier-Bold",
    italic: "Courier-Oblique",
    boldItalic: "Courier-BoldOblique",
  },
} as const;

type FontSet = (typeof FONT_SETS)[keyof typeof FONT_SETS];

/** Headings may run on their own typeface; "match" keeps them on the body's. */
function headingFontsFor(design: Design): FontSet {
  return FONT_SETS[design.headingFamily === "match" ? design.fontFamily : design.headingFamily];
}

function applyCase(text: string, mode: Design["sectionHeadingCase"]): string {
  if (mode === "upper") return text.toUpperCase();
  if (mode === "title") {
    return text
      .toLowerCase()
      .replace(/\b[a-z]/g, (char) => char.toUpperCase());
  }
  return text;
}

function buildStyles(design: Design) {
  const fonts = FONT_SETS[design.fontFamily];
  const headingFonts = headingFontsFor(design);
  const scale = DENSITY_SCALE[design.density];
  const gap = (points: number) => Math.round(points * scale * 100) / 100;
  const rule = design.accentColor || design.textColor;

  return StyleSheet.create({
    page: {
      paddingTop: gap(40),
      paddingBottom: gap(40),
      paddingHorizontal: MARGIN_POINTS[design.margin],
      fontFamily: fonts.regular,
      fontSize: design.baseFontSize,
      lineHeight: design.lineHeight,
      color: design.textColor,
    },
    header: {
      marginBottom: gap(6),
      alignItems: design.headerAlign === "center" ? "center" : "flex-start",
    },
    h1: {
      fontSize: design.nameFontSize,
      fontFamily: headingFonts.bold,
      color: design.accentColor || design.textColor,
      textAlign: design.headerAlign,
      // Generous gap so PDF text extractors emit a line break between the name
      // and the contact line instead of running them together.
      marginBottom: gap(6),
    },
    headerLine: {
      textAlign: design.headerAlign,
      marginBottom: gap(2),
    },
    sectionHeadingWrap: {
      marginTop: gap(13),
      marginBottom: gap(5),
      alignSelf: design.sectionHeadingRule === "under-text" ? "flex-start" : "stretch",
      borderBottomWidth: design.sectionHeadingRule === "none" ? 0 : 0.75,
      borderBottomColor: rule,
      paddingBottom: design.sectionHeadingRule === "none" ? 0 : 2,
    },
    h2: {
      fontSize: design.headingFontSize,
      fontFamily: headingFonts.bold,
      color: design.accentColor || design.textColor,
      letterSpacing: design.sectionHeadingCase === "upper" ? 0.6 : 0,
    },
    h3: {
      fontSize: Math.min(design.headingFontSize, design.baseFontSize + 1),
      fontFamily: headingFonts.bold,
      marginTop: gap(8),
    },
    para: {
      marginBottom: gap(3),
    },
    bulletRow: {
      flexDirection: "row",
      marginBottom: gap(2),
      paddingLeft: 4,
    },
    bulletMark: {
      width: design.baseFontSize,
    },
    bulletBody: {
      flex: 1,
    },
  });
}

function fontFor(run: TextRun, fonts: FontSet): string {
  if (run.bold && run.italic) return fonts.boldItalic;
  if (run.bold) return fonts.bold;
  if (run.italic) return fonts.italic;
  return fonts.regular;
}

function renderRuns(
  runs: TextRun[],
  fonts: FontSet,
  linkColor: string,
  underlineLinks: boolean,
) {
  return runs.map((run, i) => {
    const style = { fontFamily: fontFor(run, fonts) };

    // Links are emitted as real PDF annotations so they stay clickable in the
    // exported file, with the label text left exactly as written.
    if (run.href) {
      return (
        <Link
          key={i}
          src={run.href}
          style={{
            ...style,
            color: linkColor,
            textDecoration: underlineLinks ? "underline" : "none",
          }}
        >
          {run.text}
        </Link>
      );
    }

    return (
      <Text key={i} style={style}>
        {run.text}
      </Text>
    );
  });
}

export function ResumeDocument({ blocks, design }: { blocks: Block[]; design?: Design }) {
  const resolved = normalizeDesign(design);
  const styles = buildStyles(resolved);
  const fonts = FONT_SETS[resolved.fontFamily];
  const headingFonts = headingFontsFor(resolved);
  const linkColor = resolved.accentColor || resolved.textColor;
  const underline = resolved.linkStyle === "underline";

  const body = (runs: TextRun[]) => renderRuns(runs, fonts, linkColor, underline);
  const heading = (runs: TextRun[]) => renderRuns(runs, headingFonts, linkColor, underline);

  // Everything above the first section heading is the contact block, and moves
  // with `headerAlign`.
  const firstSection = blocks.findIndex((block) => block.type === "h2");
  const headerEnd = firstSection === -1 ? 0 : firstSection;

  const renderBlock = (block: Block, i: number) => {
    if (block.type === "bullet") {
      return (
        <View key={i} style={styles.bulletRow} wrap={false}>
          <Text style={styles.bulletMark}>{resolved.bulletChar}</Text>
          <Text style={styles.bulletBody}>{body(block.runs)}</Text>
        </View>
      );
    }

    if (block.type === "h2") {
      const cased = block.runs.map((run) => ({
        ...run,
        text: applyCase(run.text, resolved.sectionHeadingCase),
      }));
      return (
        <View key={i} style={styles.sectionHeadingWrap} wrap={false}>
          <Text style={styles.h2}>{heading(cased)}</Text>
        </View>
      );
    }

    const isHeading = block.type === "h1" || block.type === "h3";
    const style =
      block.type === "h1" ? styles.h1 : block.type === "h3" ? styles.h3 : styles.para;

    return (
      <Text key={i} style={style}>
        {isHeading ? heading(block.runs) : body(block.runs)}
      </Text>
    );
  };

  return (
    <Document>
      <Page size={resolved.paperSize} style={styles.page}>
        {headerEnd > 0 && (
          <View style={styles.header}>
            {blocks.slice(0, headerEnd).map((block, i) =>
              block.type === "h1" ? (
                <Text key={i} style={styles.h1}>
                  {heading(block.runs)}
                </Text>
              ) : (
                <Text key={i} style={styles.headerLine}>
                  {body(block.runs)}
                </Text>
              ),
            )}
          </View>
        )}
        {blocks.slice(headerEnd).map((block, i) => renderBlock(block, i))}
      </Page>
    </Document>
  );
}
