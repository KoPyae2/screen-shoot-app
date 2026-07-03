import { cn } from "../../lib/utils";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  className?: string;
}

export function Slider({ value, min, max, step = 1, onChange, className }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn("snap-slider h-1.5 w-full cursor-pointer appearance-none rounded-full", className)}
      style={{
        background: `linear-gradient(to right, var(--color-brand) ${pct}%, var(--color-border) ${pct}%)`,
      }}
    />
  );
}
