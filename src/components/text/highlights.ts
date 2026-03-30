import type { Highlight } from "../../types";

/** Color map for highlight types (warm palette). */
export const HIGHLIGHT_COLORS: Record<Highlight["type"], string> = {
  word: "var(--hl-word-bg)",
  phrase: "var(--hl-phrase-bg)",
  grammar: "var(--hl-grammar-bg)",
};

export const HIGHLIGHT_BORDER_COLORS: Record<Highlight["type"], string> = {
  word: "var(--hl-word-border)",
  phrase: "var(--hl-phrase-border)",
  grammar: "var(--hl-grammar-border)",
};

export const TYPE_LABELS: Record<Highlight["type"], string> = {
  word: "单词",
  phrase: "短语",
  grammar: "语法",
};

export interface HighlightSpan {
  start: number;
  end: number;
  highlight: Highlight;
}

/**
 * Find all occurrences of each highlight in the input text (case-insensitive),
 * sort by position, and remove overlaps.
 */
export function buildHighlightSpans(
  text: string,
  highlights: Highlight[],
): HighlightSpan[] {
  const spans: HighlightSpan[] = [];
  const lowerText = text.toLowerCase();

  for (const h of highlights) {
    const searchStr = h.text.toLowerCase();
    if (!searchStr) continue;
    let idx = 0;
    while (true) {
      const found = lowerText.indexOf(searchStr, idx);
      if (found === -1) break;
      spans.push({ start: found, end: found + searchStr.length, highlight: h });
      idx = found + 1;
    }
  }

  // Sort by start position, then by length descending (prefer longer matches)
  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  // Remove overlaps: keep earlier / longer spans
  const result: HighlightSpan[] = [];
  let lastEnd = 0;
  for (const span of spans) {
    if (span.start >= lastEnd) {
      result.push(span);
      lastEnd = span.end;
    }
  }

  return result;
}
