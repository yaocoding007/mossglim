import { useEffect, useState } from "react";
import useReviewStore from "../../stores/reviewStore";
import { getDueReviewCount } from "../../services/api";
import type { FlashcardSubMode } from "../../types";
import FlashcardMode from "./FlashcardMode";
import QuickScanMode from "./QuickScanMode";

export default function ReviewEntryPage() {
  const { mode, setMode, setFlashcardSubMode, flashcardSubMode, loadReviewItems, isLoading } =
    useReviewStore();
  const [dueCount, setDueCount] = useState<number>(0);
  const [countLoading, setCountLoading] = useState(true);

  useEffect(() => {
    setCountLoading(true);
    getDueReviewCount()
      .then((count) => setDueCount(count))
      .finally(() => setCountLoading(false));
  }, []);

  // If a mode is selected, show that mode's component
  if (mode === "flashcard") {
    return <FlashcardMode />;
  }
  if (mode === "quick_scan") {
    return <QuickScanMode />;
  }

  const handleStartFlashcard = async () => {
    setMode("flashcard");
    await loadReviewItems();
  };

  const handleStartQuickScan = async () => {
    setMode("quick_scan");
    await loadReviewItems();
  };

  const subModeOptions: { value: FlashcardSubMode; label: string }[] = [
    { value: "def_to_word", label: "看释义猜单词" },
    { value: "word_to_def", label: "看单词猜释义" },
    { value: "spelling", label: "拼写单词" },
  ];

  return (
    <div className="flex flex-col h-full p-6 animate-fade-in-up">
      <h1
        className="text-xl font-bold mb-6"
        style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}
      >
        今日复习
      </h1>

      {/* Due count */}
      <div className="mb-8">
        {countLoading ? (
          <div style={{ color: "var(--text-secondary)" }}>加载中...</div>
        ) : dueCount === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="text-lg" style={{ color: "var(--text-secondary)" }}>
              今日没有待复习的词汇
            </div>
            <div className="text-sm mt-2" style={{ color: "var(--text-tertiary)" }}>
              继续学习新词汇，它们将在合适的时间出现在复习列表中
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              待复习词汇
            </div>
            <div
              className="text-3xl font-bold"
              style={{ color: "var(--accent)" }}
            >
              {dueCount} 个
            </div>
          </div>
        )}
      </div>

      {dueCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Flashcard section */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              闪卡模式
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              翻转卡片，测试你对单词的记忆。支持三种子模式。
            </p>

            {/* Sub-mode buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {subModeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFlashcardSubMode(opt.value)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    backgroundColor:
                      flashcardSubMode === opt.value
                        ? "var(--accent-muted)"
                        : "var(--bg-elevated)",
                    color:
                      flashcardSubMode === opt.value
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                    border: `1px solid ${
                      flashcardSubMode === opt.value
                        ? "var(--border-active)"
                        : "var(--border)"
                    }`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleStartFlashcard}
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                color: "var(--bg-base)",
              }}
            >
              {isLoading ? "加载中..." : "开始复习"}
            </button>
          </div>

          {/* Quick scan section */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              快速浏览
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              以列表形式快速浏览待复习词汇，适合快速刷词。
            </p>

            <button
              onClick={handleStartQuickScan}
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                color: "var(--bg-base)",
              }}
            >
              {isLoading ? "加载中..." : "开始复习"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
