import React from "react";

/** Small caps "eyebrow" label used for section headers throughout the app. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-display text-[11px] font-bold uppercase tracking-widest2 text-ink-soft">
      {children}
    </div>
  );
}

/**
 * The signature graphic motif: a dimension line with tick caps, echoing the
 * literal chin->crown measurement line used in the canvas overlay. Used in
 * UI chrome to tie the brand back to the function of the tool.
 */
export function DimensionLine({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="28" height="14" viewBox="0 0 28 14" className="shrink-0">
        <line x1="2" y1="2" x2="2" y2="12" stroke="#B8472F" strokeWidth="1.5" />
        <line x1="2" y1="7" x2="26" y2="7" stroke="#B8472F" strokeWidth="1.5" />
        <line x1="26" y1="2" x2="26" y2="12" stroke="#B8472F" strokeWidth="1.5" />
      </svg>
      {label && (
        <span className="font-mono text-xs text-measure tabular">{label}</span>
      )}
    </div>
  );
}

export type StepKey = "upload" | "specs" | "editing" | "exporting";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "specs", label: "Specs" },
  { key: "editing", label: "Adjust" },
  { key: "exporting", label: "Export" },
];

/**
 * A ruler-styled progress rail. Justified as a sequence indicator (not
 * decorative numbering) because the workflow genuinely is linear:
 * upload -> specs -> adjust -> export.
 */
export function RulerProgress({ current }: { current: StepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-stretch">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="relative h-2 w-full">
              <div
                className={`absolute inset-y-0 left-0 right-0 ${
                  i === 0 ? "rounded-l" : ""
                } ${i === STEPS.length - 1 ? "rounded-r" : ""} ${
                  isDone || isActive ? "bg-measure" : "bg-line"
                }`}
              />
              <div
                className={`absolute -top-1 left-1/2 h-4 w-px -translate-x-1/2 ${
                  isActive ? "bg-measure" : "bg-transparent"
                }`}
              />
            </div>
            <span
              className={`font-mono text-[10px] uppercase tracking-wide ${
                isActive ? "text-ink font-semibold" : isDone ? "text-ink-soft" : "text-ink-faint"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-panel border border-line rounded-md shadow-[0_1px_2px_rgba(28,34,48,0.06)] ${className}`}>
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-display text-sm font-semibold uppercase tracking-wide px-4 py-2.5 rounded-sm bg-ink text-paper hover:bg-ink/90 active:bg-ink/80 disabled:bg-ink-faint disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`font-display text-sm font-semibold uppercase tracking-wide px-4 py-2.5 rounded-sm border border-ink/30 text-ink hover:bg-ink/5 active:bg-ink/10 disabled:text-ink-faint disabled:border-line disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
