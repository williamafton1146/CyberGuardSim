import { StatCard } from "@/components/ui/StatCard";
import type { UserStats } from "@/types";

type StatsOverviewProps = {
  stats: UserStats;
};

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Сессии" value={String(stats.total_sessions)} />
        <StatCard label="Завершено" value={String(stats.completed_sessions)} accent="safe" />
        <StatCard label="Успешность" value={`${stats.success_rate}%`} accent="safe" />
        <StatCard label="Ошибки" value={String(stats.total_mistakes)} accent="alert" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-6">
          <p className="eyebrow">Прогресс по веткам</p>
          <div className="mt-5 space-y-3">
            {stats.scenario_progress.map((item) => (
              <div key={item.slug} className="soft-tile flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">{item.title}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{item.status}</p>
                </div>
                <span className="text-sm font-semibold text-[var(--color-accent)]">{item.best_score} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-alert)]">Последние ошибки</p>
          <div className="mt-5 space-y-3">
            {stats.recent_mistakes.length ? (
              stats.recent_mistakes.map((mistake, index) => (
                <div
                  key={`${mistake.option_label}-${index}`}
                  className="rounded-[1.35rem] border border-[rgba(255,114,92,0.24)] bg-[var(--color-alert-soft)] p-4 text-sm text-[var(--color-text-secondary)]"
                >
                  <p className="font-medium text-[var(--color-text-primary)]">{mistake.scenario_title}</p>
                  <p className="mt-2">{mistake.option_label}</p>
                  <p className="mt-2 text-[var(--color-text-muted)]">{mistake.consequence_text}</p>
                </div>
              ))
            ) : (
              <p className="soft-tile text-sm text-[var(--color-text-muted)]">
                Ошибок пока нет. После первой миссии здесь появятся проблемные места и последствия выбора.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
