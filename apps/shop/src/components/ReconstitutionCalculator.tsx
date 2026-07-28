"use client";

import { useState } from "react";
import { calculateReconstitution, type SyringeSize } from "@/lib/reconstitution";

const VIAL_OPTIONS = ["5", "10", "15", "20", "40"];
const WATER_OPTIONS = ["1", "2", "3", "5"];
const DOSE_OPTIONS = ["0.5", "1", "2", "4", "8", "12"];
const SYRINGES: { max: SyringeSize; ml: string }[] = [
  { max: 30, ml: "0.3" },
  { max: 50, ml: "0.5" },
  { max: 100, ml: "1.0" },
];

function resolveField(selectValue: string, customValue: string): number | null {
  const raw = selectValue === "custom" ? customValue : selectValue;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function floor1(n: number): number {
  return Math.floor(n * 10) / 10;
}

type DropdownFieldProps = {
  id: string;
  label: string;
  unit: string;
  options: string[];
  selectValue: string;
  customValue: string;
  onSelectChange: (v: string) => void;
  onCustomChange: (v: string) => void;
};

function DropdownField({
  id,
  label,
  unit,
  options,
  selectValue,
  customValue,
  onSelectChange,
  onCustomChange,
}: DropdownFieldProps) {
  const customInputId = `${id}-custom`;
  return (
    <div className="mb-[18px]">
      <label
        htmlFor={id}
        className="block text-[10.5px] uppercase tracking-[0.08em] text-[color:var(--ink-soft)] mb-1.5"
      >
        {label}
      </label>
      <select
        id={id}
        className="p-calc-select w-full bg-transparent border-0 border-b border-[color:var(--line)] pr-5 pl-0.5 py-2 text-base text-[color:var(--ink)] focus:outline-none focus:border-[color:var(--specimen)]"
        value={selectValue}
        onChange={(e) => onSelectChange(e.target.value)}
      >
        {options.map((v) => (
          <option key={v} value={v}>
            {v} {unit}
          </option>
        ))}
        <option value="custom">Custom…</option>
      </select>
      {selectValue === "custom" && (
        <div className="mt-2 flex items-baseline gap-2">
          <label htmlFor={customInputId} className="sr-only">
            Custom {label}
          </label>
          <input
            id={customInputId}
            type="number"
            min="0"
            step="any"
            autoFocus
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="0.0"
            className="w-full bg-transparent border-0 border-b border-[color:var(--specimen)] px-0.5 py-2 text-base text-[color:var(--ink)] focus:outline-none"
          />
          <span className="text-xs text-[color:var(--ink-soft)] whitespace-nowrap">{unit}</span>
        </div>
      )}
    </div>
  );
}

export default function ReconstitutionCalculator() {
  const [vialSelect, setVialSelect] = useState("10");
  const [vialCustom, setVialCustom] = useState("");
  const [waterSelect, setWaterSelect] = useState("3");
  const [waterCustom, setWaterCustom] = useState("");
  const [doseSelect, setDoseSelect] = useState("2");
  const [doseCustom, setDoseCustom] = useState("");
  const [syringeMax, setSyringeMax] = useState<SyringeSize>(100);

  const vialMg = resolveField(vialSelect, vialCustom);
  const waterMl = resolveField(waterSelect, waterCustom);
  const doseMg = resolveField(doseSelect, doseCustom);
  const result = calculateReconstitution({ vialMg, waterMl, doseMg, syringeMax });
  const syringe = SYRINGES.find((s) => s.max === syringeMax)!;
  const gaugePct = result.valid ? Math.min((result.unitsPerInjection / syringeMax) * 100, 100) : 0;

  return (
    <div className="grid gap-12 border border-[color:var(--line)] p-10 md:grid-cols-2">
      {/* Inputs */}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--specimen)] mb-5">Inputs</p>

        <DropdownField
          id="vial-strength"
          label="Vial Strength"
          unit="mg"
          options={VIAL_OPTIONS}
          selectValue={vialSelect}
          customValue={vialCustom}
          onSelectChange={setVialSelect}
          onCustomChange={setVialCustom}
        />
        <DropdownField
          id="bac-water"
          label="Bacteriostatic Water"
          unit="ml"
          options={WATER_OPTIONS}
          selectValue={waterSelect}
          customValue={waterCustom}
          onSelectChange={setWaterSelect}
          onCustomChange={setWaterCustom}
        />
        <DropdownField
          id="target-dose"
          label="Target Dose"
          unit="mg"
          options={DOSE_OPTIONS}
          selectValue={doseSelect}
          customValue={doseCustom}
          onSelectChange={setDoseSelect}
          onCustomChange={setDoseCustom}
        />

        <fieldset className="border-0 p-0 m-0">
          <legend className="p-0 text-[10.5px] uppercase tracking-[0.08em] text-[color:var(--ink-soft)] mb-2">
            Syringe Size
          </legend>
          <div className="flex flex-col gap-2.5">
            {SYRINGES.map((s) => (
              <label
                key={s.max}
                className={`flex items-center gap-2 text-[13px] cursor-pointer ${
                  syringeMax === s.max
                    ? "text-[color:var(--ink)] font-semibold"
                    : "text-[color:var(--ink-soft)]"
                }`}
              >
                <input
                  type="radio"
                  name="syringe-size"
                  checked={syringeMax === s.max}
                  onChange={() => setSyringeMax(s.max)}
                  className="accent-[color:var(--specimen)]"
                />
                {s.max} units · {s.ml} ml
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Result */}
      <div className="min-w-0 border-t border-[color:var(--line)] pt-10 md:border-t-0 md:border-l md:pl-12 md:pt-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--specimen)] mb-5">Result</p>

        {result.valid ? (
          <>
            <p className="p-serif-italic text-[44px] leading-none text-[color:var(--ink)]">
              {result.injections > 1
                ? `${result.injections} × ${round1(result.unitsPerInjection)} units`
                : `${round1(result.totalUnits)} units`}
            </p>
            <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)] mt-1.5">
              {result.injections > 1
                ? `as ${result.injections} separate injections on a ${syringeMax}-unit (${syringe.ml}ml) syringe`
                : `Draw to this mark on a ${syringeMax}-unit (${syringe.ml}ml) syringe`}
            </p>

            <div className="pt-3.5">
              <div className="relative h-2.5 border border-[color:var(--line)] bg-[color:var(--paper-deep)]">
                <div
                  className="absolute inset-y-0 left-0 bg-[color:var(--specimen)] opacity-45"
                  style={{ width: `${gaugePct}%` }}
                />
                <div
                  className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[color:var(--paper)] bg-[color:var(--specimen)] shadow-[0_0_0_1px_var(--specimen)]"
                  style={{ left: `${gaugePct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[9.5px] text-[color:var(--ink-soft)]">
                <span>0</span>
                <span>{syringeMax / 2}</span>
                <span>{syringeMax}</span>
              </div>
            </div>

            {result.injections > 1 && (
              <p className="mt-3 text-xs leading-relaxed text-[color:var(--specimen)]">
                Total dose is {round1(result.totalUnits)} units — more than a {syringeMax}-unit syringe holds in
                one draw. Split into {result.injections} injections of {round1(result.unitsPerInjection)} units
                each (drawn separately, same concentration).
              </p>
            )}

            <div className="mt-6 flex gap-10">
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)]">
                  Concentration
                </p>
                <p className="mt-0.5 text-[17px] text-[color:var(--ink)]">
                  {result.concentration.toFixed(2)} mg/ml
                </p>
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)]">
                  Doses / Vial
                </p>
                <p className="mt-0.5 text-[17px] text-[color:var(--ink)]">{floor1(result.dosesPerVial)}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="p-serif-italic text-[44px] leading-none text-[color:var(--ink)]">—</p>
            <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)] mt-1.5">
              Fill in every field to calculate
            </p>
          </>
        )}
      </div>
    </div>
  );
}
