import type { Vocabulary, VocabSource } from "../../types";

interface VocabDetailProps {
  vocab: Vocabulary;
  sources: VocabSource[];
  onClose: () => void;
  onDelete: (id: number) => void;
}

export default function VocabDetail({ vocab, sources, onClose, onDelete }: VocabDetailProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl p-6 shadow-2xl animate-scale-in"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-warm-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {vocab.word}
            </h2>
            {vocab.phonetic && (
              <p
                className="text-sm mt-0.5"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {vocab.phonetic}
              </p>
            )}
          </div>
          <button
            className="text-xl leading-none transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Definition */}
        <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
          {vocab.definition}
        </p>

        {/* Source sentences */}
        {sources.length > 0 && (
          <div className="mb-4">
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              来源句子 ({sources.length})
            </h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {sources.map((src) => (
                <li
                  key={src.id}
                  className="text-sm rounded-lg p-3"
                  style={{
                    color: "var(--text-secondary)",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {src.context_sentence}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Delete button */}
        <button
          className="w-full py-2 rounded-lg text-sm transition-colors"
          style={{
            color: "var(--warm-red)",
            border: "1px solid rgba(220, 120, 100, 0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--warm-red-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          onClick={() => onDelete(vocab.id)}
        >
          删除此词汇
        </button>
      </div>
    </div>
  );
}
