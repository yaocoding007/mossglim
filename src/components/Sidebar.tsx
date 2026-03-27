import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getDueReviewCount } from "../services/api";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { to: "/", label: "文本输入", icon: "\u{1F4DD}" },
  { to: "/vocab", label: "我的词库", icon: "\u{1F4DA}" },
  { to: "/review", label: "今日复习", icon: "\u{1F504}" },
  { to: "/stats", label: "学习统计", icon: "\u{1F4CA}" },
  { to: "/settings", label: "设置", icon: "\u2699\uFE0F" },
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
      className="w-52 flex flex-col justify-between shrink-0"
      style={{ backgroundColor: "#1a1a2e" }}
    >
      <div>
        {/* App name */}
        <div className="px-5 py-6">
          <h1 className="text-xl font-bold text-blue-400">PowerEN</h1>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom section: due review count */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="text-xs text-gray-500">今日待复习</div>
        <div className="text-2xl font-bold text-blue-400">{dueCount}</div>
      </div>
    </aside>
  );
}
