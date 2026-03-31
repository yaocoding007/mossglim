import useToastStore from "../stores/toastStore";

const TOAST_STYLES: Record<string, { border: string; color: string }> = {
  success: { border: "var(--warm-green)", color: "var(--warm-green)" },
  info: { border: "var(--accent)", color: "var(--accent)" },
  warning: { border: "var(--warm-yellow)", color: "var(--warm-yellow)" },
};

export default function Toast() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type];
        return (
          <div
            key={toast.id}
            className="px-5 py-2.5 rounded-lg text-sm font-medium animate-slide-up"
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderLeft: `3px solid ${style.border}`,
              color: style.color,
              boxShadow: "var(--shadow-warm)",
            }}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
