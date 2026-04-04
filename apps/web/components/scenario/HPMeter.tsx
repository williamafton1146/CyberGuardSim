type HPMeterProps = {
  hp: number;
  score: number;
  stepNumber: number;
  totalSteps: number;
};

export function HPMeter({ hp, score, stepNumber, totalSteps }: HPMeterProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-muted)]">Security HP</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--color-text-primary)]">{hp}</p>
        </div>
        <div className="text-right text-sm text-[var(--color-text-secondary)]">
          <p>Очки: {score}</p>
          <p>
            Шаг {stepNumber} из {totalSteps}
          </p>
        </div>
      </div>
      <div className="mt-6 h-3 overflow-hidden rounded-full bg-[var(--color-surface)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-alert via-[#ffba49] to-safe transition-all"
          style={{ width: `${Math.max(hp, 8)}%` }}
        />
      </div>
    </div>
  );
}
