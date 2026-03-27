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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl bg-gray-900 border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-gray-200">历史记录</h2>
          <button
            className="text-gray-400 hover:text-gray-200 transition-colors text-xl leading-none"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-white/10">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索历史记录..."
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-white/10 text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="text-center text-gray-500 py-8">加载中...</div>
          ) : texts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">暂无历史记录</div>
          ) : (
            <ul className="space-y-2">
              {texts.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                  onClick={() => onSelect(t)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {truncate(t.content, 120)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(t.created_at)}
                    </p>
                  </div>
                  <button
                    className="shrink-0 px-2 py-1 text-xs text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover:opacity-100"
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
