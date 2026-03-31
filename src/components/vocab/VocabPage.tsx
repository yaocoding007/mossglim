import { useEffect, useState } from "react";
import useVocabStore from "../../stores/vocabStore";
import useToastStore from "../../stores/toastStore";
import { addVocabManual } from "../../services/api";
import VocabCard from "./VocabCard";
import VocabDetail from "./VocabDetail";

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

  const addToast = useToastStore((s) => s.addToast);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");

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
