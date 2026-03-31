import { useEffect, useState, useRef, useCallback } from "react";
import useVocabStore from "../../stores/vocabStore";
import useReviewStore from "../../stores/reviewStore";
import useToastStore from "../../stores/toastStore";
import { addVocabManual, getVocabSources } from "../../services/api";
import VocabCard from "./VocabCard";
import VocabDetail from "./VocabDetail";
import FlashcardMode from "../review/FlashcardMode";
import QuickScanMode from "../review/QuickScanMode";
import type { ReviewItem, ReviewMode, VocabSource } from "../../types";

type TypeFilter = "all" | "word" | "phrase";

export default function VocabPage() {
  const {
    vocabs,
    sourceCounts,
    selectedVocab,
    selectedSources,
    isLoading,
    setFilter,
    loadVocabs,
    selectVocab,
    closeDetail,
    removeVocab,
  } = useVocabStore();

  const startPractice = useReviewStore((s) => s.startPractice);
  const reviewMode = useReviewStore((s) => s.mode);

  const addToast = useToastStore((s) => s.addToast);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [practiceMode, setPracticeMode] = useState<ReviewMode | null>(null);
  const [showPracticeMenu, setShowPracticeMenu] = useState(false);
  const [isPracticeLoading, setIsPracticeLoading] = useState(false);
  const practiceMenuRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    loadVocabs();
  }, [loadVocabs]);

  // Update filter when type or search changes
  useEffect(() => {
    setFilter({
      type: typeFilter === "all" ? undefined : typeFilter,
      search: search || undefined,
    });
  }, [typeFilter, search, setFilter]);

  // When review mode resets to null (user clicked "返回"), exit practice view
  useEffect(() => {
    if (practiceMode && reviewMode === null) {
      setPracticeMode(null);
    }
  }, [reviewMode, practiceMode]);

  // Close practice menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (practiceMenuRef.current && !practiceMenuRef.current.contains(e.target as Node)) {
        setShowPracticeMenu(false);
      }
    };
    if (showPracticeMenu) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [showPracticeMenu]);

  const handleStartPractice = useCallback(async (mode: ReviewMode) => {
    setShowPracticeMenu(false);
    if (vocabs.length === 0) return;

    setIsPracticeLoading(true);
    try {
      const items: ReviewItem[] = await Promise.all(
        vocabs.map(async (vocab) => {
          let sources: VocabSource[] = [];
          try {
            sources = await getVocabSources(vocab.id);
          } catch {
            // ignore — sources are optional for practice
          }
          return {
            vocab,
            schedule: {
              id: 0,
              vocab_id: vocab.id,
              next_review_at: "",
              last_reviewed_at: null,
              interval_level: 0,
              consecutive_correct: 0,
              review_count: 0,
            },
            sources,
          };
        }),
      );
      startPractice(items, mode);
      setPracticeMode(mode);
    } catch {
      addToast("启动练习失败", "warning");
    } finally {
      setIsPracticeLoading(false);
    }
  }, [vocabs, startPractice, addToast]);

  const handleAddManual = async () => {
    const word = prompt("请输入单词或短语：");
    if (!word) return;
    const definition = prompt("请输入释义：");
    if (!definition) return;

    try {
      const type = word.includes(" ") ? "phrase" : "word";
      const { isNew } = await addVocabManual(word, type as "word" | "phrase", definition);
      if (isNew) {
        addToast(`已将 "${word}" 加入词库`, "success");
      } else {
        addToast(`"${word}" 已在词库中`, "info");
      }
      await loadVocabs();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addToast(`添加失败：${message}`, "warning");
    }
  };

  const filterButtons: { label: string; value: TypeFilter }[] = [
    { label: "全部", value: "all" },
    { label: "单词", value: "word" },
    { label: "短语", value: "phrase" },
  ];

  // Practice mode: render FlashcardMode or QuickScanMode
  if (practiceMode) {
    return practiceMode === "flashcard" ? <FlashcardMode /> : <QuickScanMode />;
  }

  return (
    <div className="flex flex-col h-full p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}
        >
          我的词库
        </h1>
        <div className="flex items-center gap-2">
          {/* Practice dropdown */}
          <div className="relative" ref={practiceMenuRef}>
            <button
              className="px-4 py-1.5 rounded-lg text-sm transition-colors"
              style={{
                color: vocabs.length === 0 ? "var(--text-tertiary)" : "var(--accent)",
                border: `1px solid ${vocabs.length === 0 ? "var(--border)" : "var(--border-active)"}`,
                opacity: isPracticeLoading ? 0.6 : 1,
              }}
              disabled={vocabs.length === 0 || isPracticeLoading}
              onMouseEnter={(e) => {
                if (vocabs.length > 0) e.currentTarget.style.backgroundColor = "var(--accent-muted)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              onClick={() => setShowPracticeMenu((v) => !v)}
            >
              {isPracticeLoading ? "加载中..." : "练习"}
            </button>
            {showPracticeMenu && (
              <div
                className="absolute right-0 mt-1 py-1 rounded-lg shadow-lg z-10 min-w-[140px]"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                }}
              >
                <button
                  className="w-full text-left px-4 py-2 text-sm transition-colors"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--accent-muted)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  onClick={() => handleStartPractice("flashcard")}
                >
                  闪卡练习
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm transition-colors"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--accent-muted)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  onClick={() => handleStartPractice("quick_scan")}
                >
                  快速浏览
                </button>
              </div>
            )}
          </div>
          <button
            className="px-4 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              color: "var(--accent)",
              border: "1px solid var(--border-active)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--accent-muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            onClick={handleAddManual}
          >
            手动添加
          </button>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2 mb-4">
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            className="px-3 py-1 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor:
                typeFilter === btn.value ? "var(--accent-muted)" : "transparent",
              color:
                typeFilter === btn.value ? "var(--accent)" : "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              if (typeFilter !== btn.value) {
                e.currentTarget.style.backgroundColor = "var(--accent-muted)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (typeFilter !== btn.value) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            onClick={() => setTypeFilter(btn.value)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="搜索单词或释义..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none mb-4 transition-colors"
        style={{
          backgroundColor: "var(--bg-surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--border-active)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      />

      {/* Card grid */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <p style={{ color: "var(--text-tertiary)" }}>加载中...</p>
        </div>
      ) : vocabs.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <p style={{ color: "var(--text-tertiary)" }}>
            暂无词汇，开始分析文本或手动添加吧
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 overflow-y-auto flex-1">
          {vocabs.map((vocab, idx) => (
            <VocabCard
              key={vocab.id}
              vocab={vocab}
              sourceCount={sourceCounts[vocab.id] ?? 0}
              onClick={() => selectVocab(vocab)}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedVocab && (
        <VocabDetail
          vocab={selectedVocab}
          sources={selectedSources}
          onClose={closeDetail}
          onDelete={removeVocab}
        />
      )}
    </div>
  );
}
