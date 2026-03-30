import { useCallback, useState } from "react";
import useTextStore from "../../stores/textStore";
import { addVocab } from "../../services/api";
import type { Text } from "../../types";
import type { AnalysisResult, Highlight } from "../../types";
import TextEditor from "./TextEditor";
import AnalysisPanel from "./AnalysisPanel";
import TextHistory from "./TextHistory";

interface SelectedHighlight {
  text: string;
  type: Highlight["type"];
  definition: string;
  contextSentence: string;
}

export default function TextInputPage() {
  const { clear, currentTextId, setInputText, analysis } = useTextStore();
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHighlight, setSelectedHighlight] =
    useState<SelectedHighlight | null>(null);

  const handleSelectHistory = useCallback(
    (text: Text) => {
      setInputText(text.content);
      try {
        const analysis: AnalysisResult = JSON.parse(text.analysis_json);
        useTextStore.setState({
          inputText: text.content,
          analysis,
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
      setSelectedHighlight(null);
    },
    [setInputText],
  );

  const handleAddVocab = useCallback(
    async (
      word: string,
      type: "word" | "phrase",
      definition: string,
      contextSentence: string,
    ) => {
      if (!currentTextId) {
        alert("请先分析文本");
        return;
      }
      try {
        await addVocab(word, type, definition, "", currentTextId, contextSentence);
        alert(`已将 "${word}" 加入词库`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alert(`添加失败：${message}`);
      }
    },
    [currentTextId],
  );

  return (
    <div className="flex flex-col h-full p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}
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
            onClick={() => {
              clear();
              setSelectedHighlight(null);
            }}
          >
            清空重来
          </button>
        </div>
      </div>

      {/* Content: left-right layout */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left panel: Text + Translation */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Text Editor */}
          <div className="flex-1 min-h-0">
            <TextEditor
              onAddVocab={handleAddVocab}
              selectedHighlight={selectedHighlight}
              onSelectHighlight={setSelectedHighlight}
            />
          </div>

          {/* Translation below text */}
          {analysis && (
            <div className="shrink-0">
              <div
                className="px-4 py-2 rounded-t-lg text-sm font-semibold"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--bg-base)",
                }}
              >
                译文
              </div>
              <div
                className="px-4 py-3 rounded-b-lg text-sm leading-relaxed whitespace-pre-wrap max-h-40 overflow-auto"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  borderLeft: "1px solid var(--border)",
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {analysis.translation}
              </div>
            </div>
          )}
        </div>

        {/* Right panel: Word definition + Sentence analysis */}
        <div className="flex-1 min-w-0">
          <AnalysisPanel
            selectedHighlight={selectedHighlight}
            onAddVocab={handleAddVocab}
            onCloseHighlight={() => setSelectedHighlight(null)}
          />
        </div>
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
