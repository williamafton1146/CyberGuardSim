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
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.3em] text-safe">Прогресс по веткам</p>
          <div className="mt-5 space-y-3">
            {stats.scenario_progress.map((item) => (
              <div key={item.slug} className="flex items-center justify-between rounded-2xl border border-white/10 bg-ink/40 px-4 py-3">
                <div>
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="text-sm text-skyglass/65">{item.status}</p>
                </div>
                <span className="text-sm text-safe">{item.best_score} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.3em] text-alert">Последние ошибки</p>
          <div className="mt-5 space-y-3">
            {stats.recent_mistakes.length ? (
              stats.recent_mistakes.map((mistake, index) => (
                <div key={`${mistake.option_label}-${index}`} className="rounded-2xl border border-alert/20 bg-alert/10 p-4 text-sm text-skyglass/85">
                  <p className="font-medium text-white">{mistake.scenario_title}</p>
                  <p className="mt-2">{mistake.option_label}</p>
                  <p className="mt-2 text-skyglass/70">{mistake.consequence_text}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-white/10 bg-ink/40 p-4 text-sm text-skyglass/70">
                Ошибок пока нет. После первой миссии здесь появятся проблемные места и последствия выбора.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

