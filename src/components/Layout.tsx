import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import useSettingsStore from "../stores/settingsStore";

export default function Layout() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="noise-overlay flex h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      <Sidebar />
      <main
        className="flex-1 overflow-auto"
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        <Outlet />
      </main>
    </div>
  );
}
