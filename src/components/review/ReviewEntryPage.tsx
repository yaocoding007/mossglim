import { useEffect, useState } from "react";
import useReviewStore from "../../stores/reviewStore";
import { getDueReviewCount } from "../../services/api";
import type { FlashcardSubMode } from "../../types";
import FlashcardMode from "./FlashcardMode";

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

  const handleStartFlashcard = async () => {
    setMode("flashcard");
    await loadReviewItems();
  };

  const subModeOptions: { value: FlashcardSubMode; label: string }[] = [
    { value: "def_to_word", label: "看释义猜单词" },
    { value: "word_to_def", label: "看单词猜释义" },
    { value: "spelling", label: "拼写单词" },
  ];

  return (
    <div className="flex flex-col h-full p-6">
      <h1 className="text-xl font-bold text-gray-200 mb-6">今日复习</h1>

      {/* Due count */}
      <div className="mb-8">
        {countLoading ? (
          <div className="text-gray-400">加载中...</div>
        ) : dueCount === 0 ? (
          <div className="rounded-xl bg-gray-800 border border-gray-700 p-8 text-center">
            <div className="text-lg text-gray-400">今日没有待复习的词汇</div>
            <div className="text-sm text-gray-500 mt-2">继续学习新词汇，它们将在合适的时间出现在复习列表中</div>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-800 border border-gray-700 p-6">
            <div className="text-sm text-gray-400 mb-1">待复习词汇</div>
            <div className="text-3xl font-bold text-blue-400">{dueCount} 个</div>
          </div>
        )}
      </div>

      {dueCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Flashcard section */}
          <div className="rounded-xl bg-gray-800 border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-200 mb-2">闪卡模式</h2>
            <p className="text-sm text-gray-400 mb-4">
              翻转卡片，测试你对单词的记忆。支持三种子模式。
            </p>

            {/* Sub-mode buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {subModeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFlashcardSubMode(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    flashcardSubMode === opt.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleStartFlashcard}
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {isLoading ? "加载中..." : "开始复习"}
            </button>
          </div>

          {/* Quick scan section (placeholder for Task 9) */}
          <div className="rounded-xl bg-gray-800 border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-200 mb-2">快速浏览</h2>
            <p className="text-sm text-gray-400 mb-4">
              以列表形式快速浏览待复习词汇，适合快速刷词。
            </p>

            <button
              disabled
              className="w-full px-4 py-2.5 rounded-lg bg-gray-700 text-gray-400 font-medium cursor-not-allowed"
            >
              即将上线
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
