import { useEffect, useState } from "react";
import useVocabStore from "../../stores/vocabStore";
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
      await addVocabManual(word, type as "word" | "phrase", definition);
      await loadVocabs();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`添加失败：${message}`);
    }
  };

  const filterButtons: { label: string; value: TypeFilter }[] = [
    { label: "全部", value: "all" },
    { label: "单词", value: "word" },
    { label: "短语", value: "phrase" },
  ];

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-200">我的词库</h1>
        <button
          className="px-4 py-1.5 rounded-lg text-sm text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 transition-colors"
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
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              typeFilter === btn.value
                ? "bg-blue-500/20 text-blue-400"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
            }`}
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
        className="w-full px-4 py-2 rounded-lg text-sm text-gray-200 placeholder-gray-500 border border-gray-700 focus:border-blue-500 focus:outline-none mb-4"
        style={{ backgroundColor: "#161b22" }}
      />

      {/* Card grid */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : vocabs.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-500">暂无词汇，开始分析文本或手动添加吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 overflow-y-auto flex-1">
          {vocabs.map((vocab) => (
            <VocabCard
              key={vocab.id}
              vocab={vocab}
              sourceCount={sourceCounts[vocab.id] ?? 0}
              onClick={() => selectVocab(vocab)}
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
