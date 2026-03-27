import { useCallback, useState } from "react";
import useTextStore from "../../stores/textStore";
import { addVocab } from "../../services/api";
import type { Text } from "../../types";
import type { AnalysisResult } from "../../types";
import TextEditor from "./TextEditor";
import AnalysisPanel from "./AnalysisPanel";
import TextHistory from "./TextHistory";

export default function TextInputPage() {
  const { clear, currentTextId, setInputText } = useTextStore();
  const [showHistory, setShowHistory] = useState(false);

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
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-200">文本输入与分析</h1>
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-1.5 rounded-lg text-sm text-gray-400 transition-colors hover:text-gray-200 hover:bg-white/10"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={() => setShowHistory(true)}
          >
            历史记录
          </button>
          <button
            className="px-4 py-1.5 rounded-lg text-sm text-gray-400 transition-colors hover:text-gray-200 hover:bg-white/10"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={clear}
          >
            清空重来
          </button>
        </div>
      </div>

      {/* Content: left-right layout */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left panel: Text Editor */}
        <div className="flex-1 min-w-0">
          <TextEditor onAddVocab={handleAddVocab} />
        </div>

        {/* Right panel: Analysis */}
        <div className="flex-1 min-w-0">
          <AnalysisPanel />
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
