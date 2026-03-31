import { useCallback, useState } from "react";
import useTextStore from "../../stores/textStore";
import useToastStore from "../../stores/toastStore";
import { addVocab } from "../../services/api";
import type { Text } from "../../types";
import type { AnalysisResult } from "../../types";
import TextEditor from "./TextEditor";
import ReadingView from "./ReadingView";
import TextHistory from "./TextHistory";

export default function TextInputPage() {
  const {
    clear, currentTextId, setInputText, inputText, analysis, isAnalyzing, error,
    streamingTranslation, streamingProgress, analyze,
  } = useTextStore();
  const addToast = useToastStore((s) => s.addToast);
  const [showHistory, setShowHistory] = useState(false);

  const handleSelectHistory = useCallback(
    (text: Text) => {
      setInputText(text.content);
      try {
        const parsed: AnalysisResult = JSON.parse(text.analysis_json);
        useTextStore.setState({
          inputText: text.content,
          analysis: parsed,
          currentTextId: text.id,
        });
      } catch {
        useTextStore.setState({
          inputText: text.content,
          analysis: null,
          currentTextId: text.id,
        });
      }
      setShowHistory(false);
    },
    [setInputText],
  );

  const handleAddVocab = useCallback(
    async (
      word: string,
      type: "word" | "phrase",
      definition: string,
      contextSentence: string,
      phonetic?: string,
    ) => {
      if (!currentTextId) {
        addToast("请先分析文本", "warning");
        return;
      }
      try {
        const { isNew } = await addVocab(
          word,
          type,
          definition,
          phonetic || "",
          currentTextId,
          contextSentence,
        );
        if (isNew) {
          addToast(`已将 "${word}" 加入词库`, "success");
        } else {
          addToast(`"${word}" 已在词库中`, "info");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        addToast(`添加失败：${message}`, "warning");
      }
    },
    [currentTextId, addToast],
  );

  const hasAnalysis = !!analysis;

  return (
    <div className="flex flex-col h-full p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1
          className="text-xl font-bold"
          style={{
            fontFamily: "var(--font-serif)",
            color: "var(--text-primary)",
          }}
        >
          文本输入与分析
        </h1>
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.borderColor = "var(--border-active)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
            onClick={() => setShowHistory(true)}
          >
            历史记录
          </button>
          <button
            className="px-4 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.borderColor = "var(--border-active)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
            onClick={clear}
          >
            {hasAnalysis ? "重新输入" : "清空"}
          </button>
          {!hasAnalysis && (
            <button
              className="px-5 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                color: "var(--bg-base)",
                boxShadow: "var(--shadow-warm)",
              }}
              onClick={analyze}
              disabled={!inputText.trim() || isAnalyzing}
            >
              {isAnalyzing ? "分析中..." : "开始分析"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {/* Error state */}
        {error && (
          <div className="max-w-3xl mx-auto mb-4">
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--warm-red-bg)",
                color: "var(--warm-red)",
                border: "1px solid var(--warm-red)",
              }}
            >
              <span>分析失败：{error}</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isAnalyzing && !streamingTranslation && (
          <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{
                borderColor: "var(--accent)",
                borderTopColor: "transparent",
              }}
            />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              AI 正在分析文本...
              {streamingProgress > 0 && (
                <span style={{ color: "var(--text-tertiary)" }}>
                  {` (已接收 ${streamingProgress} tokens)`}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Streaming preview: show original text + translation while analysis continues */}
        {isAnalyzing && streamingTranslation && (
          <div className="flex flex-col gap-6 animate-fade-in-up">
            <div className="max-w-3xl mx-auto w-full">
              {/* Original text */}
              <div
                className="rounded-t-lg p-5 text-sm leading-loose whitespace-pre-wrap"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  borderBottom: "none",
                }}
              >
                {inputText}
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
                {streamingTranslation}
              </div>
            </div>

            {/* Analysis in progress indicator */}
            <div className="max-w-3xl mx-auto w-full flex items-center gap-2 px-4 py-3">
              <div
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{
                  borderColor: "var(--accent)",
                  borderTopColor: "transparent",
                }}
              />
              <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                正在完成句子结构分析...
              </span>
            </div>
          </div>
        )}

        {/* Input mode: full-width textarea */}
        {!hasAnalysis && !isAnalyzing && (
          <TextEditor />
        )}

        {/* Reading mode: after analysis */}
        {hasAnalysis && !isAnalyzing && (
          <ReadingView
            inputText={inputText}
            analysis={analysis}
            onAddVocab={handleAddVocab}
          />
        )}
      </div>

      {/* History Modal */}
      {showHistory && (
        <TextHistory
          onSelect={handleSelectHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
