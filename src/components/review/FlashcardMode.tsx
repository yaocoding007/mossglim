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
      <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in-up">
        <div
          className="text-4xl font-bold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--warm-green)" }}
        >
          复习完成！
        </div>
        <p style={{ color: "var(--text-secondary)" }}>你已完成所有待复习的词汇</p>
        <button
          onClick={reset}
          className="px-6 py-2 rounded-lg font-medium transition-all"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
            color: "var(--bg-base)",
          }}
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
    <div className="flex flex-col items-center h-full p-6 gap-6 animate-fade-in-up">
      {/* Progress */}
      <div className="w-full max-w-lg">
        <div className="flex justify-between text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
          <span>{currentIndex + 1} / {total}</span>
          <span>{SUB_MODE_LABELS[flashcardSubMode]}</span>
        </div>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        >
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--accent), var(--accent-hover))",
            }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg gap-6">
        <div
          className="w-full rounded-2xl p-8 text-center min-h-[200px] flex flex-col items-center justify-center gap-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-warm-lg)",
          }}
        >
          {/* Prompt */}
          <div
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {prompt}
          </div>

          {/* Phonetic for word_to_def / spelling */}
          {flashcardSubMode !== "def_to_word" && currentItem.vocab.phonetic && (
            <div
              className="text-sm"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {currentItem.vocab.phonetic}
            </div>
          )}

          {/* Spelling input (only before flip in spelling mode) */}
          {flashcardSubMode === "spelling" && !isFlipped && (
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="输入单词拼写..."
              className="mt-4 w-full max-w-xs px-4 py-2 rounded-lg text-center focus:outline-none transition-colors"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--border-active)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
              autoFocus
            />
          )}

          {/* Flip button */}
          {!isFlipped && (
            <button
              onClick={handleFlip}
              className="mt-4 px-6 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-active)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              翻转查看答案
            </button>
          )}

          {/* Answer area (after flip) */}
          {isFlipped && (
            <div className="mt-4 space-y-3 w-full">
              <div
                className="h-px w-full"
                style={{ backgroundColor: "var(--border)" }}
              />
              <div
                className="text-xl font-semibold"
                style={{
                  color:
                    flashcardSubMode === "spelling"
                      ? isSpellingCorrect
                        ? "var(--warm-green)"
                        : "var(--warm-red)"
                      : "var(--accent)",
                }}
              >
                {answer}
              </div>
              {/* Phonetic in def_to_word */}
              {flashcardSubMode === "def_to_word" && currentItem.vocab.phonetic && (
                <div
                  className="text-sm"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {currentItem.vocab.phonetic}
                </div>
              )}
              {/* Spelling result indicator */}
              {flashcardSubMode === "spelling" && (
                <div
                  className="text-sm"
                  style={{
                    color: isSpellingCorrect ? "var(--warm-green)" : "var(--warm-red)",
                  }}
                >
                  {isSpellingCorrect ? "拼写正确！" : `你的输入: ${userInput || "(空)"}`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source sentence */}
        {isFlipped && sourceSentence && (
          <div
            className="w-full rounded-lg p-4"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>
              来源句子
            </div>
            <div
              className="text-sm italic"
              style={{ color: "var(--text-secondary)" }}
            >
              "{sourceSentence}"
            </div>
          </div>
        )}

        {/* Rating buttons */}
        {isFlipped && (
          <div className="flex gap-4">
            <button
              onClick={() => handleRate("forgot")}
              className="px-6 py-2.5 rounded-lg transition-colors"
              style={{
                backgroundColor: "var(--warm-red-bg)",
                color: "var(--warm-red)",
                border: "1px solid rgba(220,120,100,0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(220,120,100,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--warm-red-bg)";
              }}
            >
              不认识
            </button>
            <button
              onClick={() => handleRate("fuzzy")}
              className="px-6 py-2.5 rounded-lg transition-colors"
              style={{
                backgroundColor: "var(--warm-yellow-bg)",
                color: "var(--warm-yellow)",
                border: "1px solid rgba(212,165,116,0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(212,165,116,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--warm-yellow-bg)";
              }}
            >
              模糊
            </button>
            <button
              onClick={() => handleRate("remembered")}
              className="px-6 py-2.5 rounded-lg transition-colors"
              style={{
                backgroundColor: "var(--warm-green-bg)",
                color: "var(--warm-green)",
                border: "1px solid rgba(120,180,130,0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(120,180,130,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--warm-green-bg)";
              }}
            >
              记住了
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
