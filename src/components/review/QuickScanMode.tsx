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
      return submitReview(item.vocab.id, "quick_scan", subMode, result);
    });
    Promise.all(promises).catch(() => {
      /* silently ignore */
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
      <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in-up">
        <div
          className="text-4xl font-bold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--warm-green)" }}
        >
          复习完成！
        </div>
        <div className="flex gap-8 text-lg">
          <span style={{ color: "var(--warm-green)" }}>记住: {rememberedCount}</span>
          <span style={{ color: "var(--warm-red)" }}>忘记: {forgotCount}</span>
        </div>
        <p style={{ color: "var(--text-secondary)" }}>共 {items.length} 词</p>
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

  const hideModeButtons: { value: HideMode; label: string }[] = [
    { value: "hide_def", label: "隐藏释义" },
    { value: "hide_word", label: "隐藏单词" },
    { value: "show_all", label: "全部显示" },
  ];

  return (
    <div className="flex flex-col h-full p-6 animate-fade-in-up">
      {/* Top controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:underline"
          style={{ color: "var(--text-tertiary)" }}
        >
          &larr; 返回
        </button>

        {hideModeButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => changeHideMode(btn.value)}
            className="px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor:
                hideMode === btn.value ? "var(--accent-muted)" : "var(--bg-elevated)",
              color:
                hideMode === btn.value ? "var(--accent)" : "var(--text-secondary)",
              border: `1px solid ${
                hideMode === btn.value ? "var(--border-active)" : "var(--border)"
              }`,
            }}
          >
            {btn.label}
          </button>
        ))}

        <button
          onClick={handleShuffle}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-active)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          打乱
        </button>

        <span className="text-sm ml-auto" style={{ color: "var(--text-secondary)" }}>
          共 {items.length} 词
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr
              className="text-left text-sm"
              style={{
                borderBottom: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
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
                  className="cursor-pointer transition-colors"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: isFocused ? "var(--accent-muted)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isFocused) {
                      e.currentTarget.style.backgroundColor = "var(--accent-muted)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isFocused) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                  onClick={() => {
                    setFocusIndex(idx);
                    if (!isRevealed && hideMode !== "show_all") {
                      revealItem(idx);
                    }
                  }}
                >
                  {/* Word column */}
                  <td className="py-2.5 px-3" style={{ color: "var(--text-primary)" }}>
                    {hideWord ? (
                      <div
                        className="w-full h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: "var(--bg-elevated)" }}
                      >
                        {isFocused && (
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            点击揭示
                          </span>
                        )}
                      </div>
                    ) : (
                      item.vocab.word
                    )}
                  </td>

                  {/* Definition column */}
                  <td className="py-2.5 px-3" style={{ color: "var(--text-secondary)" }}>
                    {hideDef ? (
                      <div
                        className="w-full h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: "var(--bg-elevated)" }}
                      >
                        {isFocused && (
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            点击揭示
                          </span>
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
                        className="text-lg"
                        style={{
                          color: result === "remembered" ? "var(--warm-green)" : "var(--warm-red)",
                        }}
                      >
                        {result === "remembered" ? "\u2713" : "\u2717"}
                      </span>
                    ) : isRevealed || hideMode === "show_all" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markResult(idx, "remembered");
                          }}
                          className="text-lg transition-opacity hover:opacity-80"
                          style={{ color: "var(--warm-green)" }}
                          title="记住了"
                        >
                          {"\u2713"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markResult(idx, "forgot");
                          }}
                          className="text-lg transition-opacity hover:opacity-80"
                          style={{ color: "var(--warm-red)" }}
                          title="忘记了"
                        >
                          {"\u2717"}
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-tertiary)" }}>&mdash;</span>
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
