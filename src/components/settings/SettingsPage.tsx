import { useEffect, useState, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import useSettingsStore from "../../stores/settingsStore";
import { getVocabs } from "../../services/api";

export default function SettingsPage() {
  const {
    apiKey,
    aiProvider,
    customName,
    customEndpoint,
    customModel,
    fontSize,
    theme,
    isLoading,
    testResult,
    loadSettings,
    setApiKey,
    setAiProvider,
    setCustomConfig,
    setFontSize,
    setTheme,
    testConnection,
  } = useSettingsStore();

  const [localKey, setLocalKey] = useState("");
  const [localCustomName, setLocalCustomName] = useState("");
  const [localCustomEndpoint, setLocalCustomEndpoint] = useState("");
  const [localCustomModel, setLocalCustomModel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Sync local state when store loads
  useEffect(() => {
    setLocalKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    setLocalCustomName(customName);
    setLocalCustomEndpoint(customEndpoint);
    setLocalCustomModel(customModel);
  }, [customName, customEndpoint, customModel]);

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
      a.download = `mossglim-vocab-${new Date().toISOString().slice(0, 10)}.json`;
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
      const db = await Database.load("sqlite:mossglim.db");
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
    <div className="flex flex-col h-full p-6 animate-fade-in-up">
      <h1
        className="text-xl font-bold mb-6"
        style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}
      >
        设置
      </h1>

      <div className="max-w-lg space-y-8">
        {/* Theme Section */}
        <section>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            主题
          </label>
          <div className="flex gap-2">
            {([["dark", "深色 Dark"], ["light", "浅色 Light"], ["sage", "淡绿灰 Sage"]] as const).map(
              ([value, label]) => (
                <button
                  key={value}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor:
                      theme === value
                        ? "var(--accent-muted)"
                        : "var(--bg-surface)",
                    color:
                      theme === value
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                    border: `1px solid ${
                      theme === value
                        ? "var(--border-active)"
                        : "var(--border)"
                    }`,
                  }}
                  onClick={() => setTheme(value)}
                >
                  {label}
                </button>
              )
            )}
          </div>
        </section>

        {/* AI Provider Section */}
        <section>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            AI 服务商
          </label>
          <div className="flex gap-2">
            {(["claude", "openai", "custom"] as const).map((provider) => (
              <button
                key={provider}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor:
                    aiProvider === provider
                      ? "var(--accent-muted)"
                      : "var(--bg-surface)",
                  color:
                    aiProvider === provider
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                  border: `1px solid ${
                    aiProvider === provider
                      ? "var(--border-active)"
                      : "var(--border)"
                  }`,
                }}
                onClick={() => setAiProvider(provider)}
              >
                {provider === "claude"
                  ? "Claude"
                  : provider === "openai"
                    ? "OpenAI"
                    : customName || "自定义"}
              </button>
            ))}
          </div>

          {/* Custom provider config */}
          {aiProvider === "custom" && (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={localCustomName}
                onChange={(e) => setLocalCustomName(e.target.value)}
                placeholder="服务商名称，如 DeepSeek"
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--border-active)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
              <input
                type="text"
                value={localCustomEndpoint}
                onChange={(e) => setLocalCustomEndpoint(e.target.value)}
                placeholder="API 地址，如 https://api.deepseek.com/v1/chat/completions"
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--border-active)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
              <input
                type="text"
                value={localCustomModel}
                onChange={(e) => setLocalCustomModel(e.target.value)}
                placeholder="模型名称，如 deepseek-chat"
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--border-active)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                  color: "var(--bg-base)",
                }}
                onClick={() => setCustomConfig(localCustomName.trim(), localCustomEndpoint.trim(), localCustomModel.trim())}
                disabled={!localCustomEndpoint.trim() || !localCustomModel.trim()}
              >
                保存配置
              </button>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                支持所有 OpenAI 兼容的 API（DeepSeek、Qwen、Ollama 等）
              </p>
            </div>
          )}
        </section>

        {/* API Key Section */}
        <section>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
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
              className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
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
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                color: "var(--bg-base)",
              }}
              onClick={handleSaveKey}
              disabled={isSaving || !localKey.trim()}
            >
              保存
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-active)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
              onClick={testConnection}
              disabled={isLoading}
            >
              {isLoading ? "测试中..." : "测试连接"}
            </button>
            {testResult !== null && (
              <span
                className="text-sm"
                style={{
                  color:
                    testResult === "success"
                      ? "var(--warm-green)"
                      : "var(--warm-red)",
                }}
              >
                {testResult === "success" ? "连接成功" : testResult}
              </span>
            )}
          </div>
        </section>

        {/* Font Size Section */}
        <section>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            字体大小
          </label>
          <div className="flex gap-2">
            {([["small", "小"], ["medium", "默认"], ["large", "大"]] as const).map(
              ([value, label]) => (
                <button
                  key={value}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor:
                      fontSize === value
                        ? "var(--accent-muted)"
                        : "var(--bg-surface)",
                    color:
                      fontSize === value
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                    border: `1px solid ${
                      fontSize === value
                        ? "var(--border-active)"
                        : "var(--border)"
                    }`,
                  }}
                  onClick={() => setFontSize(value)}
                >
                  {label}
                </button>
              )
            )}
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
            调整应用中所有文字的大小
          </p>
        </section>

        {/* Data Management Section */}
        <section style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
          <label
            className="block text-sm font-medium mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            数据管理
          </label>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-active)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
              onClick={handleExport}
            >
              导出词库 (JSON)
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: clearConfirm
                  ? "rgba(220,120,100,0.8)"
                  : "var(--warm-red-bg)",
                color: clearConfirm ? "white" : "var(--warm-red)",
                border: "1px solid rgba(220,120,100,0.3)",
              }}
              onClick={handleClearAll}
            >
              {clearConfirm ? "确认清空？" : "清空所有数据"}
            </button>
            {clearConfirm && (
              <button
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
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
