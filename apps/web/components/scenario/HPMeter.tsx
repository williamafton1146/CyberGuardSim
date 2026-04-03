type HPMeterProps = {
  hp: number;
  score: number;
  stepNumber: number;
  totalSteps: number;
};

export function HPMeter({ hp, score, stepNumber, totalSteps }: HPMeterProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-ambient">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-skyglass/60">Security HP</p>
          <p className="mt-3 text-4xl font-semibold text-white">{hp}</p>
        </div>
        <div className="text-right text-sm text-skyglass/75">
          <p>Очки: {score}</p>
          <p>
            Шаг {stepNumber} из {totalSteps}
          </p>
        </div>
      </div>
      <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-alert via-[#ffba49] to-safe transition-all"
          style={{ width: `${Math.max(hp, 8)}%` }}
        />
      </div>
    </div>
  );
}

