import type { DecisionOption } from "@/types";

type DecisionPanelProps = {
  options: DecisionOption[];
  disabled?: boolean;
  onSelect: (optionId: number) => void;
};

export function DecisionPanel({ options, disabled, onSelect }: DecisionPanelProps) {
  return (
    <div className="grid gap-3">
      {options.map((option) => (
        <button
          key={option.id}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left text-sm leading-6 text-white transition hover:border-safe/40 hover:bg-safe/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

