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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl p-6 border border-gray-700 shadow-2xl"
        style={{ backgroundColor: "#161b22" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-100">{vocab.word}</h2>
            {vocab.phonetic && (
              <p className="text-sm text-gray-500 mt-0.5">{vocab.phonetic}</p>
            )}
          </div>
          <button
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Definition */}
        <p className="text-gray-300 mb-4">{vocab.definition}</p>

        {/* Source sentences */}
        {sources.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">
              来源句子 ({sources.length})
            </h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {sources.map((src) => (
                <li
                  key={src.id}
                  className="text-sm text-gray-400 bg-black/30 rounded-lg p-3"
                >
                  {src.context_sentence}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Delete button */}
        <button
          className="w-full py-2 rounded-lg text-sm text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
          onClick={() => onDelete(vocab.id)}
        >
          删除此词汇
        </button>
      </div>
    </div>
  );
}
