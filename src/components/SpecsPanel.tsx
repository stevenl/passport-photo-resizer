import React, { useState } from "react";
import type { PassportSpecs } from "@/types";
import { SPEC_PRESETS } from "@/state/initialState";
import { DimensionLine, Eyebrow } from "./Primitives";

interface SpecsPanelProps {
  specs: PassportSpecs;
  onChange: (specs: Partial<PassportSpecs>) => void;
}

function NumberField({
  label,
  value,
  unit,
  onChange,
  min = 0,
  max = 1000,
  step = 0.1,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [raw, setRaw] = useState(String(value));

  React.useEffect(() => {
    setRaw(String(value));
  }, [value]);

  return (
    <label className="block">
      <span className="font-display text-[11px] font-bold uppercase tracking-widest2 text-ink-soft">
        {label}
      </span>
      <div className="mt-1.5 flex items-center rounded-sm border border-line bg-paper focus-within:border-ink">
        <input
          type="number"
          inputMode="decimal"
          className="w-full bg-transparent px-3 py-2 font-mono text-sm tabular text-ink outline-none"
          value={raw}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            setRaw(e.target.value);
            const n = parseFloat(e.target.value);
            if (!Number.isNaN(n) && n >= min && n <= max) {
              onChange(n);
            }
          }}
          onBlur={() => {
            const n = parseFloat(raw);
            if (Number.isNaN(n) || n < min || n > max) {
              setRaw(String(value));
            }
          }}
        />
        <span className="pr-3 font-mono text-xs text-ink-faint">{unit}</span>
      </div>
    </label>
  );
}

export default function SpecsPanel({ specs, onChange }: SpecsPanelProps) {
  return (
    <div className="space-y-5">
      <div>
        <Eyebrow>Step 2 — Output specification</Eyebrow>
        <p className="mt-1.5 text-sm text-ink-soft">
          Enter the exact dimensions required by your country's passport or
          visa authority.
        </p>
      </div>

      <label className="block">
        <span className="font-display text-[11px] font-bold uppercase tracking-widest2 text-ink-soft">
          Quick preset
        </span>
        <select
          className="mt-1.5 w-full rounded-sm border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          defaultValue=""
          onChange={(e) => {
            const preset = SPEC_PRESETS[parseInt(e.target.value, 10)];
            if (preset) {
              onChange({
                widthMm: preset.widthMm,
                heightMm: preset.heightMm,
                headHeightMm: preset.headHeightMm,
              });
            }
          }}
        >
          <option value="" disabled>
            Choose a country / document…
          </option>
          {SPEC_PRESETS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Output width"
          unit="mm"
          value={specs.widthMm}
          onChange={(v) => onChange({ widthMm: v })}
          min={10}
          max={300}
        />
        <NumberField
          label="Output height"
          unit="mm"
          value={specs.heightMm}
          onChange={(v) => onChange({ heightMm: v })}
          min={10}
          max={300}
        />
      </div>

      <div>
        <NumberField
          label="Head height (chin → crown)"
          unit="mm"
          value={specs.headHeightMm}
          onChange={(v) => onChange({ headHeightMm: v })}
          min={5}
          max={specs.heightMm}
        />
        <div className="mt-2">
          <DimensionLine label={`${specs.headHeightMm.toFixed(1)} mm`} />
        </div>
      </div>

      <NumberField
        label="Resolution"
        unit="DPI"
        value={specs.dpi}
        onChange={(v) => onChange({ dpi: v })}
        min={72}
        max={1200}
        step={1}
      />

      <div className="rounded-sm border border-line bg-paper/60 px-3 py-2.5">
        <p className="font-mono text-xs text-ink-soft tabular">
          Output canvas: {Math.round((specs.widthMm / 25.4) * specs.dpi)} ×{" "}
          {Math.round((specs.heightMm / 25.4) * specs.dpi)} px
        </p>
      </div>
    </div>
  );
}
