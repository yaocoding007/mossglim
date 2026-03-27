import { useState, useEffect, useCallback } from "react";
import useReviewStore from "../../stores/reviewStore";
import { submitReview } from "../../services/api";
import type { ReviewItem } from "../../types";

type HideMode = "hide_def" | "hide_word" | "show_all";
type ItemResult = "remembered" | "forgot";

/** Fisher-Yates shuffle (in-place, returns new array). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuickScanMode() {
  const storeItems = useReviewStore((s) => s.items);
  const reset = useReviewStore((s) => s.reset);

  const [items, setItems] = useState<ReviewItem[]>(storeItems);
  const [hideMode, setHideMode] = useState<HideMode>("hide_def");
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const [resultMap, setResultMap] = useState<Record<number, ItemResult>>({});
  const [focusIndex, setFocusIndex] = useState(0);

  // Sync items from store on mount
  useEffect(() => {
    setItems(storeItems);
  }, [storeItems]);

  const allDone = items.length > 0 && Object.keys(resultMap).length === items.length;

  // Submit results to API when all items are done
  useEffect(() => {
    if (!allDone) return;
    const subMode = hideMode === "show_all" ? "hide_def" : hideMode;
    const promises = items.map((item, idx) => {
      const result = resultMap[idx];
      // "remembered" -> "remembered", "forgot" -> "forgot"
      return submitReview(item.vocab.id, "quick_scan", subMode, result);
    });
    Promise.all(promises).catch(() => {
      /* silently ignore – completion screen will still show */
    });
  }, [allDone, items, resultMap, hideMode]);

  const handleShuffle = useCallback(() => {
    setItems((prev) => shuffle(prev));
    setRevealedSet(new Set());
    setResultMap({});
    setFocusIndex(0);
  }, []);

  const revealItem = useCallback(
    (idx: number) => {
      if (hideMode === "show_all") return;
      setRevealedSet((prev) => {
        const next = new Set(prev);
        next.add(idx);
        return next;
      });
    },
    [hideMode],
  );

  const markResult = useCallback((idx: number, result: ItemResult) => {
    setResultMap((prev) => ({ ...prev, [idx]: result }));
  }, []);

  const changeHideMode = useCallback((mode: HideMode) => {
    setHideMode(mode);
    setRevealedSet(new Set());
    setResultMap({});
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        if (hideMode !== "show_all" && !revealedSet.has(focusIndex)) {
          revealItem(focusIndex);
        } else {
          setFocusIndex((prev) => Math.min(prev + 1, items.length - 1));
        }
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusIndex, hideMode, revealedSet, items.length, revealItem]);

  // Completion screen
  if (allDone) {
    const rememberedCount = Object.values(resultMap).filter((r) => r === "remembered").length;
    const forgotCount = Object.values(resultMap).filter((r) => r === "forgot").length;

    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="text-4xl font-bold text-green-400">复习完成！</div>
        <div className="flex gap-8 text-lg">
          <span className="text-green-400">记住: {rememberedCount}</span>
          <span className="text-red-400">忘记: {forgotCount}</span>
        </div>
        <p className="text-gray-400">共 {items.length} 词</p>
        <button
          onClick={reset}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          返回
        </button>
      </div>
    );
  }

  const hideModeButtons: { value: HideMode; label: string }[] = [
    { value: "hide_def", label: "隐藏释义" },
    { value: "hide_word", label: "隐藏单词" },
    { value: "show_all", label: "全部显示" },
  ];

  return (
    <div className="flex flex-col h-full p-6">
      {/* Top controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {hideModeButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => changeHideMode(btn.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              hideMode === btn.value
                ? "bg-blue-600 border border-blue-500 text-white"
                : "bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {btn.label}
          </button>
        ))}

        <button
          onClick={handleShuffle}
          className="px-3 py-1.5 rounded-lg text-sm bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600 transition-colors"
        >
          {"🔀 打乱"}
        </button>

        <span className="text-sm text-gray-400 ml-auto">共 {items.length} 词</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
              <th className="py-2 px-3 font-medium">单词/短语</th>
              <th className="py-2 px-3 font-medium">释义</th>
              <th className="py-2 px-3 font-medium w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isFocused = idx === focusIndex;
              const isRevealed = revealedSet.has(idx);
              const result = resultMap[idx];
              const hideWord = hideMode === "hide_word" && !isRevealed;
              const hideDef = hideMode === "hide_def" && !isRevealed;

              return (
                <tr
                  key={`${item.vocab.id}-${idx}`}
                  className={`border-b border-gray-800 cursor-pointer transition-colors ${
                    isFocused ? "bg-gray-800" : "hover:bg-gray-800/50"
                  }`}
                  onClick={() => {
                    setFocusIndex(idx);
                    if (!isRevealed && hideMode !== "show_all") {
                      revealItem(idx);
                    }
                  }}
                >
                  {/* Word column */}
                  <td className="py-2.5 px-3 text-gray-200">
                    {hideWord ? (
                      <div className="w-full h-6 rounded bg-[#333] flex items-center justify-center">
                        {isFocused && (
                          <span className="text-xs text-gray-500">点击揭示</span>
                        )}
                      </div>
                    ) : (
                      item.vocab.word
                    )}
                  </td>

                  {/* Definition column */}
                  <td className="py-2.5 px-3 text-gray-300">
                    {hideDef ? (
                      <div className="w-full h-6 rounded bg-[#333] flex items-center justify-center">
                        {isFocused && (
                          <span className="text-xs text-gray-500">点击揭示</span>
                        )}
                      </div>
                    ) : (
                      item.vocab.definition
                    )}
                  </td>

                  {/* Action column */}
                  <td className="py-2.5 px-3 w-24">
                    {result ? (
                      <span
                        className={`text-lg ${
                          result === "remembered" ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {result === "remembered" ? "✓" : "✗"}
                      </span>
                    ) : isRevealed || hideMode === "show_all" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markResult(idx, "remembered");
                          }}
                          className="text-green-400 hover:text-green-300 text-lg"
                          title="记住了"
                        >
                          ✓
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markResult(idx, "forgot");
                          }}
                          className="text-red-400 hover:text-red-300 text-lg"
                          title="忘记了"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
