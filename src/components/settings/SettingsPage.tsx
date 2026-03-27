import { useEffect, useState, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import useSettingsStore from "../../stores/settingsStore";
import { getVocabs } from "../../services/api";

export default function SettingsPage() {
  const {
    apiKey,
    aiProvider,
    isLoading,
    testResult,
    loadSettings,
    setApiKey,
    setAiProvider,
    testConnection,
  } = useSettingsStore();

  const [localKey, setLocalKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Sync localKey when apiKey loaded from store
  useEffect(() => {
    setLocalKey(apiKey);
  }, [apiKey]);

  const handleSaveKey = useCallback(async () => {
    if (!localKey.trim()) return;
    setIsSaving(true);
    try {
      await setApiKey(localKey.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert("保存失败：" + message);
    }
    setIsSaving(false);
  }, [localKey, setApiKey]);

  const handleExport = useCallback(async () => {
    try {
      const vocabs = await getVocabs();
      const json = JSON.stringify(vocabs, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `poweren-vocab-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert("导出失败：" + message);
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    try {
      const db = await Database.load("sqlite:poweren.db");
      await db.execute("DELETE FROM review_logs");
      await db.execute("DELETE FROM review_schedule");
      await db.execute("DELETE FROM vocab_sources");
      await db.execute("DELETE FROM vocabulary");
      await db.execute("DELETE FROM texts");
      setClearConfirm(false);
      alert("所有数据已清空");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert("清空失败：" + message);
    }
  }, [clearConfirm]);

  return (
    <div className="flex flex-col h-full p-6">
      <h1 className="text-xl font-bold text-gray-200 mb-6">设置</h1>

      <div className="max-w-lg space-y-8">
        {/* AI Provider Section */}
        <section>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            AI 服务商
          </label>
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                aiProvider === "claude"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
              onClick={() => setAiProvider("claude")}
            >
              Claude
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                aiProvider === "openai"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
              onClick={() => setAiProvider("openai")}
            >
              OpenAI
            </button>
          </div>
        </section>

        {/* API Key Section */}
        <section>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder={
                aiProvider === "claude"
                  ? "sk-ant-api03-..."
                  : "sk-..."
              }
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50"
              onClick={handleSaveKey}
              disabled={isSaving || !localKey.trim()}
            >
              保存
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50"
              onClick={testConnection}
              disabled={isLoading}
            >
              {isLoading ? "测试中..." : "测试连接"}
            </button>
            {testResult !== null && (
              <span
                className={`text-sm ${
                  testResult === "success"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {testResult === "success" ? "连接成功" : testResult}
              </span>
            )}
          </div>
        </section>

        {/* Data Management Section */}
        <section className="border-t border-white/10 pt-6">
          <label className="block text-sm font-medium text-gray-300 mb-4">
            数据管理
          </label>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-white/5 text-gray-300 hover:bg-white/10"
              onClick={handleExport}
            >
              导出词库 (JSON)
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                clearConfirm
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
              }`}
              onClick={handleClearAll}
            >
              {clearConfirm ? "确认清空？" : "清空所有数据"}
            </button>
            {clearConfirm && (
              <button
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
                onClick={() => setClearConfirm(false)}
              >
                取消
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
