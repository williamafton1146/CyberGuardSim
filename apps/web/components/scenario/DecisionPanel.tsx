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
          className="rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-5 py-4 text-left text-sm leading-6 text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
