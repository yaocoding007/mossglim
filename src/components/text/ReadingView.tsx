import { useState, useCallback, useRef, useEffect } from "react";
import type { AnalysisResult, Highlight } from "../../types";
import {
  HIGHLIGHT_COLORS,
  HIGHLIGHT_BORDER_COLORS,
  TYPE_LABELS,
  buildHighlightSpans,
} from "./highlights";

interface SelectedHighlight {
  text: string;
  type: Highlight["type"];
  definition: string;
  contextSentence: string;
}

interface SelectionInfo {
  text: string;
  x: number;
  y: number;
}

interface ReadingViewProps {
  inputText: string;
  analysis: AnalysisResult;
  onAddVocab: (
    word: string,
    type: "word" | "phrase",
    definition: string,
    contextSentence: string,
  ) => void;
}

/** Tag component for sentence structure roles. */
function RoleTag({
  label,
  text,
  color,
}: {
  label: string;
  text: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium mr-2 mb-1"
      style={{ backgroundColor: color, color: "var(--text-primary)" }}
    >
      <span className="opacity-70">{label}</span>
      {text}
    </span>
  );
}

export default function ReadingView({
  inputText,
  analysis,
  onAddVocab,
}: ReadingViewProps) {
  const [selectedHighlight, setSelectedHighlight] =
    useState<SelectedHighlight | null>(null);
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
  const [sentencesExpanded, setSentencesExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close word card on Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedHighlight(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    onAddVocab(selectionInfo.text, isPhrase ? "phrase" : "word", "", selectionInfo.text);
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  }, [selectionInfo, onAddVocab]);

  const findContextSentence = useCallback(
    (word: string) => {
      return (
        inputText
          .split(/[.!?]+/)
          .find((s) => s.toLowerCase().includes(word.toLowerCase()))
          ?.trim() || word
      );
    },
    [inputText],
  );

  const handleWordClick = useCallback(
    (word: string, type: Highlight["type"], definition: string) => {
      setSelectionInfo(null);
      const ctx = findContextSentence(word);
      if (selectedHighlight && selectedHighlight.text === word) {
        setSelectedHighlight(null);
      } else {
        setSelectedHighlight({ text: word, type, definition, contextSentence: ctx });
      }
    },
    [selectedHighlight, findContextSentence],
  );

  // Build highlight spans
  const spans = buildHighlightSpans(inputText, analysis.highlights);

  // Render plain text with each word clickable
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
            handleWordClick(word, type, def);
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

  // Build rendered segments
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
          handleWordClick(
            span.highlight.text,
            span.highlight.type,
            span.highlight.definition,
          );
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
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Original text + Translation */}
      <div
        ref={containerRef}
        className="max-w-3xl mx-auto w-full"
        onMouseUp={handleMouseUp}
        onClick={() => setSelectedHighlight(null)}
      >
        {/* Original text with highlights */}
        <div
          className="rounded-t-lg p-5 text-sm leading-loose whitespace-pre-wrap"
          style={{
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderBottom: "none",
          }}
        >
          {segments}
        </div>

        {/* Translation */}
        <div
          className="p-5 rounded-b-lg text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-tertiary)",
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            borderTop: "2px dashed var(--border)",
          }}
        >
          {analysis.translation}
        </div>
      </div>

      {/* Word card (inline popup) */}
      {selectedHighlight && (
        <div className="max-w-3xl mx-auto w-full">
          <div
            className="rounded-lg p-4 animate-slide-up"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-warm-lg)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-lg font-bold"
                  style={{
                    color: HIGHLIGHT_BORDER_COLORS[selectedHighlight.type],
                  }}
                >
                  {selectedHighlight.text}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor:
                      selectedHighlight.type === "word"
                        ? "var(--warm-red-bg)"
                        : selectedHighlight.type === "phrase"
                          ? "var(--warm-yellow-bg)"
                          : "var(--warm-green-bg)",
                    color: HIGHLIGHT_BORDER_COLORS[selectedHighlight.type],
                  }}
                >
                  {TYPE_LABELS[selectedHighlight.type]}
                </span>
              </div>
              <button
                className="transition-colors text-lg leading-none"
                style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHighlight(null);
                }}
              >
                ×
              </button>
            </div>

            <p
              className="text-sm leading-relaxed mb-3 break-words"
              style={{ color: "var(--text-secondary)" }}
            >
              {selectedHighlight.definition || "暂无释义"}
            </p>

            <button
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                color: "var(--bg-base)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onAddVocab(
                  selectedHighlight.text,
                  selectedHighlight.type === "grammar"
                    ? "phrase"
                    : selectedHighlight.type,
                  selectedHighlight.definition,
                  selectedHighlight.contextSentence,
                );
              }}
            >
              加入词库
            </button>
          </div>
        </div>
      )}

      {/* Sentence structure analysis (collapsible) */}
      <div className="max-w-3xl mx-auto w-full">
        <button
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
          style={{
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-active)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
          }}
          onClick={() => setSentencesExpanded(!sentencesExpanded)}
        >
          <span>句子结构分析（{analysis.sentences.length} 句）</span>
          <span
            className="transition-transform"
            style={{
              transform: sentencesExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </span>
        </button>

        {sentencesExpanded && (
          <div className="mt-2 space-y-3 animate-fade-in-up">
            {analysis.sentences.map((sentence, idx) => (
              <div
                key={idx}
                className="rounded-lg p-4"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-sm italic mb-3 leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {sentence.original}
                </p>

                <div className="flex flex-wrap gap-1">
                  {sentence.structure.subject.text && (
                    <RoleTag
                      label="主语"
                      text={sentence.structure.subject.text}
                      color="rgba(220, 120, 100, 0.5)"
                    />
                  )}
                  {sentence.structure.predicate.text && (
                    <RoleTag
                      label="谓语"
                      text={sentence.structure.predicate.text}
                      color="rgba(120, 180, 130, 0.5)"
                    />
                  )}
                  {sentence.structure.object.text && (
                    <RoleTag
                      label="宾语"
                      text={sentence.structure.object.text}
                      color="rgba(212, 165, 116, 0.5)"
                    />
                  )}
                  {sentence.structure.modifiers.map((mod, mIdx) => (
                    <RoleTag
                      key={mIdx}
                      label={mod.role || "修饰语"}
                      text={mod.text}
                      color="rgba(180, 140, 200, 0.5)"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating "加入词库" button on text selection */}
      {selectionInfo && (
        <button
          className="fixed z-50 px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg transition-transform hover:scale-105"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-hover))",
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
