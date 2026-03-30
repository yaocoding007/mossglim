import type { Vocabulary } from "../../types";

interface VocabCardProps {
  vocab: Vocabulary;
  sourceCount: number;
  onClick: () => void;
  index?: number;
}

const statusConfig = {
  new: { label: "待复习", bgColor: "var(--warm-red-bg)", textColor: "var(--warm-red)" },
  learning: { label: "学习中", bgColor: "var(--warm-yellow-bg)", textColor: "var(--warm-yellow)" },
  mastered: { label: "已掌握", bgColor: "var(--warm-green-bg)", textColor: "var(--warm-green)" },
} as const;

export default function VocabCard({ vocab, sourceCount, onClick, index = 0 }: VocabCardProps) {
  const status = statusConfig[vocab.status];

  return (
    <div
      className="rounded-lg p-4 cursor-pointer transition-all animate-fade-in-up"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
        animationDelay: `${index * 50}ms`,
        boxShadow: "var(--shadow-warm)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-active)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onClick={onClick}
    >
      {/* Header: word + status badge */}
      <div className="flex items-center justify-between mb-2">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {vocab.word}
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: status.bgColor,
            color: status.textColor,
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Definition */}
      <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
        {vocab.definition}
      </p>

      {/* Source count link */}
      <p className="text-xs" style={{ color: "var(--accent)" }}>
        查看 {sourceCount} 个来源句子 →
      </p>
    </div>
  );
}
