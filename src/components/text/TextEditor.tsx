import { useState, useCallback, useRef } from "react";
import useTextStore from "../../stores/textStore";
import type { Highlight } from "../../types";

interface TextEditorProps {
  onAddVocab: (
    word: string,
    type: "word" | "phrase",
    definition: string,
    contextSentence: string,
  ) => void;
}

interface SelectionInfo {
  text: string;
  x: number;
  y: number;
}

/** Color map for highlight types. */
const HIGHLIGHT_COLORS: Record<Highlight["type"], string> = {
  word: "rgba(239, 68, 68, 0.3)", // red
  phrase: "rgba(234, 179, 8, 0.3)", // yellow
  grammar: "rgba(34, 197, 94, 0.3)", // green
};

const HIGHLIGHT_BORDER_COLORS: Record<Highlight["type"], string> = {
  word: "rgb(239, 68, 68)",
  phrase: "rgb(234, 179, 8)",
  grammar: "rgb(34, 197, 94)",
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

export default function TextEditor({ onAddVocab }: TextEditorProps) {
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
    // Determine type: single word or phrase
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
          className="flex-1 w-full resize-none rounded-lg p-4 text-sm leading-relaxed text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          style={{ backgroundColor: "#161b22" }}
          placeholder="在这里粘贴或输入英文文本..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isAnalyzing}
        />
        <button
          className="mt-3 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#2563eb" }}
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

  // Build segments: alternating plain text and highlighted spans
  const segments: React.ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    // Plain text before this span
    if (cursor < span.start) {
      segments.push(
        <span key={`plain-${cursor}`}>
          {inputText.slice(cursor, span.start)}
        </span>,
      );
    }
    // Highlighted span
    segments.push(
      <span
        key={`hl-${i}`}
        className="cursor-pointer rounded px-0.5 transition-opacity hover:opacity-80"
        style={{
          backgroundColor: HIGHLIGHT_COLORS[span.highlight.type],
          borderBottom: `2px solid ${HIGHLIGHT_BORDER_COLORS[span.highlight.type]}`,
        }}
        title={`${span.highlight.definition} (点击加入词库)`}
        onClick={() =>
          onAddVocab(
            span.highlight.text,
            span.highlight.type === "grammar" ? "phrase" : span.highlight.type,
            span.highlight.definition,
            inputText
              .split(/[.!?]+/)
              .find((s) =>
                s.toLowerCase().includes(span.highlight.text.toLowerCase()),
              )
              ?.trim() || span.highlight.text,
          )
        }
      >
        {inputText.slice(span.start, span.end)}
      </span>,
    );
    cursor = span.end;
  }
  // Remaining text
  if (cursor < inputText.length) {
    segments.push(
      <span key={`plain-${cursor}`}>{inputText.slice(cursor)}</span>,
    );
  }

  return (
    <div className="relative flex flex-col h-full">
      <div
        ref={containerRef}
        className="flex-1 overflow-auto rounded-lg p-4 text-sm leading-relaxed text-gray-200 whitespace-pre-wrap"
        style={{ backgroundColor: "#161b22" }}
        onMouseUp={handleMouseUp}
      >
        {segments}
      </div>

      {/* Floating "加入词库" button on text selection */}
      {selectionInfo && (
        <button
          className="fixed z-50 px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-lg transition-transform hover:scale-105"
          style={{
            backgroundColor: "#2563eb",
            left: selectionInfo.x,
            top: selectionInfo.y,
            transform: "translate(-50%, -100%)",
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
