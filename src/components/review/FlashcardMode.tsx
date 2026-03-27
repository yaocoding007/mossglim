import { useEffect, useCallback } from "react";
import useReviewStore from "../../stores/reviewStore";
import type { ReviewResult } from "../../types";

const SUB_MODE_LABELS: Record<string, string> = {
  def_to_word: "看释义，想单词",
  word_to_def: "看单词，想释义",
  spelling: "拼写单词",
};

export default function FlashcardMode() {
  const {
    items,
    currentIndex,
    flashcardSubMode,
    isFlipped,
    isComplete,
    userInput,
    flip,
    setUserInput,
    submitResult,
    reset,
  } = useReviewStore();

  const currentItem = items[currentIndex];
  const total = items.length;
  const progress = total > 0 ? ((currentIndex + (isComplete ? 1 : 0)) / total) * 100 : 0;

  // Prompt and answer based on sub-mode
  const prompt =
    flashcardSubMode === "def_to_word"
      ? currentItem?.vocab.definition
      : currentItem?.vocab.word;

  const answer =
    flashcardSubMode === "def_to_word"
      ? currentItem?.vocab.word
      : currentItem?.vocab.definition;

  // For spelling mode, check correctness
  const isSpellingCorrect =
    flashcardSubMode === "spelling" && isFlipped
      ? userInput.trim().toLowerCase() === currentItem?.vocab.word.toLowerCase()
      : false;

  const handleFlip = useCallback(() => {
    if (!isFlipped) {
      flip();
    }
  }, [isFlipped, flip]);

  // Keyboard shortcut: Enter to flip
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isFlipped && !isComplete) {
        e.preventDefault();
        handleFlip();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFlipped, isComplete, handleFlip]);

  const handleRate = useCallback(
    async (result: ReviewResult) => {
      await submitResult(result);
    },
    [submitResult],
  );

  // Completion screen
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="text-4xl font-bold text-green-400">复习完成！</div>
        <p className="text-gray-400">你已完成所有待复习的词汇</p>
        <button
          onClick={reset}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          返回
        </button>
      </div>
    );
  }

  if (!currentItem) {
    return null;
  }

  const sourceSentence = currentItem.sources[0]?.context_sentence;

  return (
    <div className="flex flex-col items-center h-full p-6 gap-6">
      {/* Progress */}
      <div className="w-full max-w-lg">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>{currentIndex + 1} / {total}</span>
          <span>{SUB_MODE_LABELS[flashcardSubMode]}</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg gap-6">
        <div className="w-full rounded-2xl bg-gray-800 border border-gray-700 p-8 text-center min-h-[200px] flex flex-col items-center justify-center gap-4">
          {/* Prompt */}
          <div className="text-2xl font-bold text-gray-100">{prompt}</div>

          {/* Phonetic for word_to_def / spelling */}
          {flashcardSubMode !== "def_to_word" && currentItem.vocab.phonetic && (
            <div className="text-sm text-gray-500">{currentItem.vocab.phonetic}</div>
          )}

          {/* Spelling input (only before flip in spelling mode) */}
          {flashcardSubMode === "spelling" && !isFlipped && (
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="输入单词拼写..."
              className="mt-4 w-full max-w-xs px-4 py-2 rounded-lg bg-gray-900 border border-gray-600 text-gray-100 text-center focus:outline-none focus:border-blue-500"
              autoFocus
            />
          )}

          {/* Flip button */}
          {!isFlipped && (
            <button
              onClick={handleFlip}
              className="mt-4 px-6 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
            >
              翻转查看答案
            </button>
          )}

          {/* Answer area (after flip) */}
          {isFlipped && (
            <div className="mt-4 space-y-3">
              <div className="h-px bg-gray-700 w-full" />
              <div
                className={`text-xl font-semibold ${
                  flashcardSubMode === "spelling"
                    ? isSpellingCorrect
                      ? "text-green-400"
                      : "text-red-400"
                    : "text-blue-400"
                }`}
              >
                {answer}
              </div>
              {/* Phonetic in def_to_word */}
              {flashcardSubMode === "def_to_word" && currentItem.vocab.phonetic && (
                <div className="text-sm text-gray-500">{currentItem.vocab.phonetic}</div>
              )}
              {/* Spelling result indicator */}
              {flashcardSubMode === "spelling" && (
                <div className={`text-sm ${isSpellingCorrect ? "text-green-400" : "text-red-400"}`}>
                  {isSpellingCorrect ? "拼写正确！" : `你的输入: ${userInput || "(空)"}`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source sentence */}
        {isFlipped && sourceSentence && (
          <div className="w-full rounded-lg bg-gray-800/50 border border-gray-700/50 p-4">
            <div className="text-xs text-gray-500 mb-1">来源句子</div>
            <div className="text-sm text-gray-300 italic">"{sourceSentence}"</div>
          </div>
        )}

        {/* Rating buttons */}
        {isFlipped && (
          <div className="flex gap-4">
            <button
              onClick={() => handleRate("forgot")}
              className="px-6 py-2.5 rounded-lg bg-red-900/50 text-red-400 border border-red-800 hover:bg-red-900/80 transition-colors"
            >
              不认识
            </button>
            <button
              onClick={() => handleRate("fuzzy")}
              className="px-6 py-2.5 rounded-lg bg-yellow-900/50 text-yellow-400 border border-yellow-800 hover:bg-yellow-900/80 transition-colors"
            >
              模糊
            </button>
            <button
              onClick={() => handleRate("remembered")}
              className="px-6 py-2.5 rounded-lg bg-green-900/50 text-green-400 border border-green-800 hover:bg-green-900/80 transition-colors"
            >
              记住了
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
