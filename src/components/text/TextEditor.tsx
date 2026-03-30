import { useState, useCallback, useRef } from "react";
import useTextStore from "../../stores/textStore";
import type { Highlight } from "../../types";

interface SelectedHighlight {
  text: string;
  type: Highlight["type"];
  definition: string;
  contextSentence: string;
}

interface TextEditorProps {
  onAddVocab: (
    word: string,
    type: "word" | "phrase",
    definition: string,
    contextSentence: string,
  ) => void;
  selectedHighlight: SelectedHighlight | null;
  onSelectHighlight: (highlight: SelectedHighlight | null) => void;
}

interface SelectionInfo {
  text: string;
  x: number;
  y: number;
}

/** Color map for highlight types (warm palette). */
const HIGHLIGHT_COLORS: Record<Highlight["type"], string> = {
  word: "var(--hl-word-bg)",
  phrase: "var(--hl-phrase-bg)",
  grammar: "var(--hl-grammar-bg)",
};

const HIGHLIGHT_BORDER_COLORS: Record<Highlight["type"], string> = {
  word: "var(--hl-word-border)",
  phrase: "var(--hl-phrase-border)",
  grammar: "var(--hl-grammar-border)",
};

interface HighlightSpan {
  start: number;
  end: number;
  highlight: Highlight;
}

/**
 * Find all occurrences of each highlight in the input text (case-insensitive),
 * sort by position, and remove overlaps.
 */
function buildHighlightSpans(
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

export default function TextEditor({
  onAddVocab,
  selectedHighlight,
  onSelectHighlight,
}: TextEditorProps) {
  const { inputText, setInputText, analysis, isAnalyzing, analyze } =
    useTextStore();
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelectionInfo(null);
      return;
    }

    const text = sel.toString().trim();
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectionInfo({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, []);

  const handleSelectionAddVocab = useCallback(() => {
    if (!selectionInfo) return;
    const isPhrase = selectionInfo.text.includes(" ");
    onAddVocab(
      selectionInfo.text,
      isPhrase ? "phrase" : "word",
      "",
      selectionInfo.text,
    );
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  }, [selectionInfo, onAddVocab]);

  // Before analysis: show textarea + button
  if (!analysis) {
    return (
      <div className="flex flex-col h-full">
        <textarea
          className="flex-1 w-full resize-none rounded-lg p-4 text-sm leading-relaxed focus:outline-none transition-colors"
          style={{
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--border-active)";
            e.currentTarget.style.boxShadow = "0 0 0 2px rgba(212,165,116,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
          placeholder="在这里粘贴或输入英文文本..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isAnalyzing}
        />
        <button
          className="mt-3 px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
            color: "var(--bg-base)",
          }}
          onClick={analyze}
          disabled={!inputText.trim() || isAnalyzing}
        >
          {isAnalyzing ? "分析中..." : "分析"}
        </button>
      </div>
    );
  }

  // After analysis: highlighted text display
  const spans = buildHighlightSpans(inputText, analysis.highlights);

  // Helper: render plain text with each word individually clickable
  const renderPlainText = (text: string, keyPrefix: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /([a-zA-Z]+(?:[''\u2019][a-zA-Z]+)*)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const word = match[1];
      const idx = match.index;
      const matchedHighlight = analysis.highlights.find(
        (h) => h.text.toLowerCase() === word.toLowerCase(),
      );
      const def = matchedHighlight?.definition || "";
      const type = matchedHighlight?.type || "word";
      parts.push(
        <span
          key={`${keyPrefix}-w-${idx}`}
          className="cursor-pointer rounded px-0.5 transition-colors"
          style={{ color: "var(--text-primary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--accent-muted)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectionInfo(null);
            const ctx =
              inputText
                .split(/[.!?]+/)
                .find((s) => s.toLowerCase().includes(word.toLowerCase()))
                ?.trim() || word;
            if (selectedHighlight && selectedHighlight.text === word) {
              onSelectHighlight(null);
            } else {
              onSelectHighlight({
                text: word,
                type,
                definition: def,
                contextSentence: ctx,
              });
            }
          }}
        >
          {word}
        </span>,
      );
      lastIndex = idx + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  // Build segments: alternating plain text and highlighted spans
  const segments: React.ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    if (cursor < span.start) {
      segments.push(
        <span key={`plain-${cursor}`}>
          {renderPlainText(inputText.slice(cursor, span.start), `p-${cursor}`)}
        </span>,
      );
    }
    const contextSentence =
      inputText
        .split(/[.!?]+/)
        .find((s) =>
          s.toLowerCase().includes(span.highlight.text.toLowerCase()),
        )
        ?.trim() || span.highlight.text;
    segments.push(
      <span
        key={`hl-${i}`}
        className="cursor-pointer rounded px-0.5 transition-opacity hover:opacity-80"
        style={{
          backgroundColor: HIGHLIGHT_COLORS[span.highlight.type],
          borderBottom: `2px solid ${HIGHLIGHT_BORDER_COLORS[span.highlight.type]}`,
        }}
        title={span.highlight.definition}
        onClick={(e) => {
          e.stopPropagation();
          setSelectionInfo(null);
          if (
            selectedHighlight &&
            selectedHighlight.text === span.highlight.text
          ) {
            onSelectHighlight(null);
          } else {
            onSelectHighlight({
              text: span.highlight.text,
              type: span.highlight.type,
              definition: span.highlight.definition,
              contextSentence,
            });
          }
        }}
      >
        {inputText.slice(span.start, span.end)}
      </span>,
    );
    cursor = span.end;
  }
  if (cursor < inputText.length) {
    segments.push(
      <span key={`plain-${cursor}`}>
        {renderPlainText(inputText.slice(cursor), `p-${cursor}`)}
      </span>,
    );
  }

  return (
    <div className="relative flex flex-col h-full">
      <div
        ref={containerRef}
        className="flex-1 overflow-auto rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap"
        style={{
          backgroundColor: "var(--bg-surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        }}
        onMouseUp={handleMouseUp}
        onClick={() => onSelectHighlight(null)}
      >
        {segments}
      </div>

      {/* Floating "加入词库" button on text selection */}
      {selectionInfo && (
        <button
          className="fixed z-50 px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg transition-transform hover:scale-105"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
            color: "var(--bg-base)",
            left: selectionInfo.x,
            top: selectionInfo.y,
            transform: "translate(-50%, -100%)",
            boxShadow: "var(--shadow-warm-lg)",
          }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSelectionAddVocab}
        >
          加入词库
        </button>
      )}
    </div>
  );
}
