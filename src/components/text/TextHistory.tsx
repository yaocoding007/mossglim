import { useCallback, useEffect, useRef, useState } from "react";
import type { Text } from "../../types";
import { deleteText, getTexts, searchTexts } from "../../services/api";

interface Props {
  onSelect: (text: Text) => void;
  onClose: () => void;
}

export default function TextHistory({ onSelect, onClose }: Props) {
  const [texts, setTexts] = useState<Text[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTexts = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const result = q.trim() ? await searchTexts(q.trim()) : await getTexts();
      setTexts(result);
    } catch {
      setTexts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTexts("");
  }, [fetchTexts]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTexts(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchTexts]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteText(id);
      setTexts((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert("删除失败");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncate = (text: string, max: number) => {
    return text.length > max ? text.slice(0, max) + "..." : text;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl shadow-2xl animate-scale-in"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-warm-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            历史记录
          </h2>
          <button
            className="transition-colors text-xl leading-none"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
            onClick={onClose}
          >
            x
          </button>
        </div>

        {/* Search */}
        <div
          className="px-6 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索历史记录..."
            className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none transition-colors"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--border-active)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>
              加载中...
            </div>
          ) : texts.length === 0 ? (
            <div className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>
              暂无历史记录
            </div>
          ) : (
            <ul className="space-y-2">
              {texts.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors group"
                  style={{ border: "1px solid transparent" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--accent-muted)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                  onClick={() => onSelect(t)}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {truncate(t.content, 120)}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {formatDate(t.created_at)}
                    </p>
                  </div>
                  <button
                    className="shrink-0 px-2 py-1 text-xs rounded transition-colors opacity-0 group-hover:opacity-100"
                    style={{ color: "var(--text-tertiary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--warm-red)";
                      e.currentTarget.style.backgroundColor = "var(--warm-red-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-tertiary)";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    onClick={(e) => handleDelete(t.id, e)}
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
