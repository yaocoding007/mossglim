import useTextStore from "../../stores/textStore";

export default function TextEditor() {
  const { inputText, setInputText, isAnalyzing } = useTextStore();

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <textarea
        className="flex-1 w-full resize-none rounded-lg p-5 text-sm leading-relaxed focus:outline-none transition-colors"
        style={{
          backgroundColor: "var(--bg-surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--border-active)";
          e.currentTarget.style.boxShadow = "0 0 0 2px rgba(212,165,116,0.1)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
        }}
        placeholder="粘贴或输入英文文本..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        disabled={isAnalyzing}
      />
    </div>
  );
}
