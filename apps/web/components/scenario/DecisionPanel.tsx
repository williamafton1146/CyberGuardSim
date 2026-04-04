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
          className="decision-option"
          disabled={disabled}
          onClick={() => onSelect(option.id)}
        >
          <span className="decision-option-kicker">Вариант действия</span>
          <span className="decision-option-label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
