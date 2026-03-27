import useTextStore from "../../stores/textStore";

/** Tag component for sentence structure roles. */
function RoleTag({
  label,
  text,
  color,
}: {
  label: string;
  text: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium mr-2 mb-1"
      style={{ backgroundColor: color, color: "#fff" }}
    >
      <span className="opacity-70">{label}</span>
      {text}
    </span>
  );
}

export default function AnalysisPanel() {
  const { analysis, isAnalyzing, error } = useTextStore();

  // Loading state
  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">AI 正在分析文本...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <div className="text-3xl">!</div>
        <p className="text-sm text-red-400 text-center">分析失败：{error}</p>
      </div>
    );
  }

  // Empty state
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <p className="text-lg text-gray-500">分析结果</p>
        <p className="text-sm text-gray-600 text-center">
          在左侧输入英文文本并点击"分析"按钮，AI 将为你提供翻译和句子结构分析。
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-1">
      {/* Translation section */}
      <div className="mb-6">
        <div
          className="px-4 py-2 rounded-t-lg text-sm font-semibold text-white"
          style={{ backgroundColor: "#2563eb" }}
        >
          译文
        </div>
        <div
          className="px-4 py-3 rounded-b-lg text-sm leading-relaxed text-gray-300 whitespace-pre-wrap"
          style={{ backgroundColor: "#161b22" }}
        >
          {analysis.translation}
        </div>
      </div>

      {/* Sentence structure analysis */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          句子结构分析
        </h3>

        {analysis.sentences.map((sentence, idx) => (
          <div
            key={idx}
            className="mb-4 rounded-lg p-4"
            style={{ backgroundColor: "#161b22" }}
          >
            {/* Original sentence */}
            <p className="text-sm text-gray-300 italic mb-3 leading-relaxed">
              {sentence.original}
            </p>

            {/* Structure tags */}
            <div className="flex flex-wrap gap-1">
              {sentence.structure.subject.text && (
                <RoleTag
                  label="主语"
                  text={sentence.structure.subject.text}
                  color="rgba(239, 68, 68, 0.7)"
                />
              )}
              {sentence.structure.predicate.text && (
                <RoleTag
                  label="谓语"
                  text={sentence.structure.predicate.text}
                  color="rgba(34, 197, 94, 0.7)"
                />
              )}
              {sentence.structure.object.text && (
                <RoleTag
                  label="宾语"
                  text={sentence.structure.object.text}
                  color="rgba(234, 179, 8, 0.7)"
                />
              )}
              {sentence.structure.modifiers.map((mod, mIdx) => (
                <RoleTag
                  key={mIdx}
                  label={mod.role || "修饰语"}
                  text={mod.text}
                  color="rgba(168, 85, 247, 0.7)"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
