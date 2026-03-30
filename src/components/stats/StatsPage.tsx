import { useEffect, useState } from "react";
import { getStats, getDb } from "../../services/api";
import type { Stats } from "../../services/api";

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div
      className="rounded-lg p-4 text-center"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
        {value}
        {suffix && (
          <span className="ml-0.5 text-lg" style={{ color: "var(--text-secondary)" }}>
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}

function StatusBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "red" | "yellow" | "green";
}) {
  const colorMap = {
    red: { bg: "var(--warm-red-bg)", text: "var(--warm-red)" },
    yellow: { bg: "var(--warm-yellow-bg)", text: "var(--warm-yellow)" },
    green: { bg: "var(--warm-green-bg)", text: "var(--warm-green)" },
  };

  const c = colorMap[color];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {label}
      <span className="font-bold">{count}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Streak calculation
// ---------------------------------------------------------------------------

async function calcStreakDays(): Promise<number> {
  try {
    const db = await getDb();
    const rows = await db.select<{ review_date: string }[]>(
      `SELECT DISTINCT date(reviewed_at) AS review_date
       FROM review_logs
       ORDER BY review_date DESC`,
    );

    if (rows.length === 0) return 0;

    const dates = rows.map((r) => r.review_date);
    const today = new Date().toISOString().slice(0, 10);
    let streak = 0;
    let checkDate = today;

    if (dates[0] !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      checkDate = yesterday.toISOString().slice(0, 10);
      if (!dates.includes(checkDate)) return 0;
    }

    const dateSet = new Set(dates);
    const cur = new Date(checkDate + "T00:00:00");
    while (dateSet.has(cur.toISOString().slice(0, 10))) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    }

    return streak;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// StatsPage
// ---------------------------------------------------------------------------

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, streak] = await Promise.all([getStats(), calcStreakDays()]);
        setStats(s);
        setStreakDays(streak);
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p style={{ color: "var(--text-secondary)" }}>加载中...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <p style={{ color: "var(--text-secondary)" }}>无法加载统计数据</p>
      </div>
    );
  }

  const total = stats.totalVocabs;
  const newPct = total > 0 ? (stats.newCount / total) * 100 : 0;
  const learningPct = total > 0 ? (stats.learningCount / total) * 100 : 0;
  const masteredPct = total > 0 ? (stats.masteredCount / total) * 100 : 0;

  return (
    <div className="flex flex-col h-full p-6 animate-fade-in-up">
      <h1
        className="text-xl font-bold mb-6"
        style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}
      >
        学习统计
      </h1>

      <div className="max-w-2xl space-y-8">
        {/* Top stats cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="总词汇量" value={stats.totalVocabs} />
          <StatCard label="今日已复习" value={stats.todayReviews} />
          <StatCard label="连续天数" value={streakDays} suffix="天" />
        </div>

        {/* Status distribution */}
        <section>
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            掌握率分布
          </h2>

          {/* Status badges */}
          <div className="flex gap-3 mb-4">
            <StatusBadge label="待复习" count={stats.newCount} color="red" />
            <StatusBadge label="学习中" count={stats.learningCount} color="yellow" />
            <StatusBadge label="已掌握" count={stats.masteredCount} color="green" />
          </div>

          {/* Progress bar */}
          <div
            className="h-3 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          >
            {total > 0 && (
              <div className="flex h-full">
                {newPct > 0 && (
                  <div
                    style={{
                      width: `${newPct}%`,
                      backgroundColor: "var(--warm-red)",
                    }}
                  />
                )}
                {learningPct > 0 && (
                  <div
                    style={{
                      width: `${learningPct}%`,
                      backgroundColor: "var(--warm-yellow)",
                    }}
                  />
                )}
                {masteredPct > 0 && (
                  <div
                    style={{
                      width: `${masteredPct}%`,
                      backgroundColor: "var(--warm-green)",
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Percentage text */}
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            {total > 0
              ? `待复习 ${newPct.toFixed(0)}% · 学习中 ${learningPct.toFixed(0)}% · 已掌握 ${masteredPct.toFixed(0)}%`
              : "暂无词汇数据"}
          </p>
        </section>
      </div>
    </div>
  );
}
