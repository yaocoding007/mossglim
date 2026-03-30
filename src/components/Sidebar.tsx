import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getDueReviewCount } from "../services/api";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

/* Inline SVG icons */
const IconDocumentText = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const IconBookOpen = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const IconRefresh = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const IconChartBar = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconCog = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const navItems: NavItem[] = [
  { to: "/", label: "文本输入", icon: IconDocumentText },
  { to: "/vocab", label: "我的词库", icon: IconBookOpen },
  { to: "/review", label: "今日复习", icon: IconRefresh },
  { to: "/stats", label: "学习统计", icon: IconChartBar },
  { to: "/settings", label: "设置", icon: IconCog },
];

export default function Sidebar() {
  const [dueCount, setDueCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const count = await getDueReviewCount();
        if (!cancelled) setDueCount(count);
      } catch {
        // silently ignore in case API is unavailable
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <aside
      className="w-52 flex flex-col justify-between shrink-0 relative"
      style={{
        backgroundColor: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div>
        {/* App name */}
        <div className="px-5 py-6">
          <h1
            className="text-xl font-bold"
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--accent)",
              letterSpacing: "0.02em",
            }}
          >
            Mossglim
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${
                  isActive
                    ? "font-medium"
                    : "hover:opacity-90"
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? "var(--accent-muted)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
              })}
            >
              {({ isActive }) => (
                <>
                  {/* Left active indicator bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r"
                      style={{ backgroundColor: "var(--accent)" }}
                    />
                  )}
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom section: due review count */}
      <div
        className="px-5 py-4 relative"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          今日待复习
        </div>
        <div
          className="text-2xl font-bold animate-shimmer"
          style={{ color: "var(--accent)" }}
        >
          {dueCount}
        </div>
        {/* Warm glow at bottom */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "rgba(212, 165, 116, 0.06)" }}
        />
      </div>
    </aside>
  );
}
