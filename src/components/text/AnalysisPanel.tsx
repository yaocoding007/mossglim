import useTextStore from "../../stores/textStore";
import type { Highlight } from "../../types";

interface SelectedHighlight {
  text: string;
  type: Highlight["type"];
  definition: string;
  contextSentence: string;
}

const HIGHLIGHT_BORDER_COLORS: Record<Highlight["type"], string> = {
  word: "var(--hl-word-border)",
  phrase: "var(--hl-phrase-border)",
  grammar: "var(--hl-grammar-border)",
};

const TYPE_LABELS: Record<Highlight["type"], string> = {
  word: "单词",
  phrase: "短语",
  grammar: "语法",
};

/** Tag component for sentence structure roles (warm palette). */
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

interface AnalysisPanelProps {
  selectedHighlight: SelectedHighlight | null;
  onAddVocab: (
    word: string,
    type: "word" | "phrase",
    definition: string,
    contextSentence: string,
  ) => void;
  onCloseHighlight: () => void;
}

export default function AnalysisPanel({
  selectedHighlight,
  onAddVocab,
  onCloseHighlight,
}: AnalysisPanelProps) {
  const { analysis, isAnalyzing, error } = useTextStore();

  // Loading state
  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          AI 正在分析文本...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <div className="text-3xl" style={{ color: "var(--warm-red)" }}>!</div>
        <p className="text-sm text-center" style={{ color: "var(--warm-red)" }}>
          分析失败：{error}
        </p>
      </div>
    );
  }

  // Empty state
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <p className="text-lg" style={{ color: "var(--text-tertiary)" }}>
          分析结果
        </p>
        <p className="text-sm text-center" style={{ color: "var(--text-tertiary)" }}>
          在左侧输入英文文本并点击"分析"按钮，AI 将为你提供翻译和句子结构分析。
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-1 flex flex-col gap-4">
      {/* Word definition card */}
      {selectedHighlight ? (
        <div
          className="shrink-0 rounded-lg p-4 animate-slide-up"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
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
              onClick={onCloseHighlight}
            >
              x
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
              background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
              color: "var(--bg-base)",
            }}
            onClick={() =>
              onAddVocab(
                selectedHighlight.text,
                selectedHighlight.type === "grammar"
                  ? "phrase"
                  : selectedHighlight.type,
                selectedHighlight.definition,
                selectedHighlight.contextSentence,
              )
            }
          >
            加入词库
          </button>
        </div>
      ) : (
        <div
          className="shrink-0 rounded-lg px-4 py-6 flex items-center justify-center"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            点击左侧文本中的单词查看释义
          </p>
        </div>
      )}

      {/* Sentence structure analysis */}
      <div className="flex-1 min-h-0">
        <h3
          className="text-sm font-semibold mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          句子结构分析
        </h3>

        {analysis.sentences.map((sentence, idx) => (
          <div
            key={idx}
            className="mb-4 rounded-lg p-4"
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
    </div>
  );
}
