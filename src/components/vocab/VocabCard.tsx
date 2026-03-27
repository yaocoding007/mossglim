import type { Vocabulary } from "../../types";

interface VocabCardProps {
  vocab: Vocabulary;
  sourceCount: number;
  onClick: () => void;
}

const statusConfig = {
  new: { label: "待复习", color: "bg-red-500/20 text-red-400" },
  learning: { label: "学习中", color: "bg-yellow-500/20 text-yellow-400" },
  mastered: { label: "已掌握", color: "bg-green-500/20 text-green-400" },
} as const;

export default function VocabCard({ vocab, sourceCount, onClick }: VocabCardProps) {
  const status = statusConfig[vocab.status];

  return (
    <div
      className="rounded-lg p-4 cursor-pointer transition-colors border border-gray-700 hover:border-blue-500"
      style={{ backgroundColor: "#161b22" }}
      onClick={onClick}
    >
      {/* Header: word + status badge */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-100">{vocab.word}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Definition */}
      <p className="text-sm text-gray-400 mb-3">{vocab.definition}</p>

      {/* Source count link */}
      <p className="text-xs text-blue-400">
        查看 {sourceCount} 个来源句子 →
      </p>
    </div>
  );
}
